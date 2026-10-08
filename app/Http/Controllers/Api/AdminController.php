<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ParticipantResource;
use App\Models\Participant;
use App\Models\Setting;
use App\Models\Team;
use App\Notifications\TeamCredentials;
use App\Notifications\TeamRejected;
use App\Notifications\TeamReopened;
use App\Support\Olympiad;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminController extends Controller
{
    /** Ustun tartibi (CSV eksport) — anketadagi band tartibida */
    private const CSV_COLUMNS = [
        'status', 'student_group', 'previous_prizewinner', 'needs_visa_invitation',
        'is_paid', 'paid_at', 'payment_amount', 'payment_currency', 'payment_note',
        'family_name_en', 'first_name_en', 'family_name_native', 'first_name_native',
        'birth_date', 'birth_place', 'sex',
        'citizenship', 'other_citizenships', 'ethnicity', 'previous_visits_uz',
        'passport_number', 'passport_issue_date', 'passport_expiry_date', 'passport_issued_by',
        'passport_scan_path', 'face_photo_path',
        'position', 'org_name', 'org_location', 'org_address', 'org_contacts', 'graduation_date', 'previous_olympiads',
        'home_location', 'home_address', 'home_phone', 'mobile_phone', 'email',
        'official_language', 'native_languages',
        'diet', 'food_notes', 'medical_notes', 'tshirt_size',
        'emergency_family_name', 'emergency_first_name', 'emergency_relation', 'emergency_age',
        'emergency_languages', 'emergency_phones', 'emergency_email', 'emergency_telegram',
    ];

    /** Readable password without look-alike characters (0/O, 1/l/I). */
    private const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

    // ---------------------------------------------------------------- teams

    /** All teams, including archived ones (the panel filters them). */
    public function teams(): JsonResponse
    {
        $teams = Team::query()
            ->with('user:id,name,email,phone')
            ->withCount([
                'participants',
                'participants as leaders_count' => fn ($q) => $q->whereIn('status', ['team_leader', 'team_leader_jury']),
                'participants as observers_count' => fn ($q) => $q->where('status', 'observer'),
                'participants as students_count' => fn ($q) => $q->where('status', 'student'),
                'participants as paid_count' => fn ($q) => $q->where('is_paid', true),
            ])
            ->orderBy('country')
            ->get();

        return response()->json($teams);
    }

    public function showTeam(Team $team): JsonResponse
    {
        $participants = $team->participants()->orderBy('id')->get();

        return response()->json([
            'team' => $team->load('user:id,name,email,phone'),
            'participants' => ParticipantResource::collection($participants),
            'payments' => [
                'paid' => $participants->where('is_paid', true)->count(),
                'unpaid' => $participants->where('is_paid', false)->count(),
                'total' => $participants->count(),
            ],
        ]);
    }

    // ---------------------------------------------------------------- payments

    /** To'lov so'rovining umumiy validatsiya qoidalari (summa va valyuta ixtiyoriy) */
    private const PAYMENT_RULES = [
        'is_paid' => ['required', 'boolean'],
        'payment_note' => ['nullable', 'string', 'max:255'],
        'payment_amount' => ['nullable', 'numeric', 'min:0', 'max:999999999.99'],
        'payment_currency' => ['nullable', 'string', 'size:3', 'alpha'],
    ];

    /** Berilmagan maydon null (o'zgarmaydi), bo'sh yuborilgan — '' (tozalanadi) */
    private static function paymentArgs(array $data, Participant $p): array
    {
        return [
            (bool) $data['is_paid'],
            array_key_exists('payment_note', $data) ? $data['payment_note'] : $p->payment_note,
            array_key_exists('payment_amount', $data) ? ($data['payment_amount'] ?? '') : null,
            array_key_exists('payment_currency', $data) ? ($data['payment_currency'] ?? '') : null,
        ];
    }

    /**
     * Bir ishtirokchining to'lov holati: to'lov qildi / qilmadi, summa, valyuta, izoh (masalan kvitansiya raqami).
     * PATCH /admin/participants/{id}/payment  { is_paid, payment_amount?, payment_currency?, payment_note? }
     */
    public function updatePayment(Request $request, Participant $participant): JsonResponse
    {
        $data = $request->validate(self::PAYMENT_RULES);

        $participant->setPayment(...self::paymentArgs($data, $participant));

        return response()->json([
            'message' => $participant->is_paid ? 'To\'lov belgilandi.' : 'To\'lov bekor qilindi.',
            'participant' => new ParticipantResource($participant->fresh()),
        ]);
    }

    /**
     * Jamoa ishtirokchilarini bir yo'la belgilash (odatda to'lov jamoa uchun bitta summada keladi).
     * POST /admin/teams/{id}/payments  { is_paid, participants?: [id, ...], payment_amount?, payment_currency?, payment_note? }
     * `participants` berilmasa — jamoaning barcha ishtirokchilari. Summa har bir ishtirokchiga alohida yoziladi.
     */
    public function updateTeamPayments(Request $request, Team $team): JsonResponse
    {
        $data = $request->validate(self::PAYMENT_RULES + [
            'participants' => ['nullable', 'array'],
            'participants.*' => ['integer', Rule::exists('participants', 'id')->where('team_id', $team->id)],
        ]);

        $query = $team->participants()->orderBy('id');
        if (!empty($data['participants'])) {
            $query->whereIn('id', $data['participants']);
        }

        $updated = DB::transaction(function () use ($query, $data) {
            $list = $query->get();
            foreach ($list as $p) {
                $p->setPayment(...self::paymentArgs($data, $p));
            }

            return $list;
        });

        $all = $team->participants()->orderBy('id')->get();

        return response()->json([
            'message' => "{$updated->count()} ta ishtirokchi " . ($data['is_paid'] ? 'to\'lov qildi deb belgilandi.' : 'to\'lov qilmadi deb belgilandi.'),
            'updated' => $updated->count(),
            'participants' => ParticipantResource::collection($all),
            'payments' => [
                'paid' => $all->where('is_paid', true)->count(),
                'unpaid' => $all->where('is_paid', false)->count(),
                'total' => $all->count(),
            ],
        ]);
    }

    /** Organisers' data of a team: the IAO team code used in the Excel application form. */
    public function updateTeam(Request $request, Team $team): JsonResponse
    {
        $data = $request->validate([
            'iao_code' => ['nullable', 'string', 'regex:/^[A-Za-z]{2,3}$/', Rule::unique('teams', 'iao_code')->ignore($team->id)->whereNull('archived_at')],
        ], [
            'iao_code.regex' => 'The IAO code is two or three Latin letters, for example UG.',
            'iao_code.unique' => 'Another active team already has this IAO code.',
        ]);

        $code = isset($data['iao_code']) && $data['iao_code'] !== '' ? strtoupper($data['iao_code']) : null;
        $team->forceFill(['iao_code' => $code])->save();

        return response()->json(['message' => 'IAO kodi saqlandi.', 'team' => $team->fresh()->load('user:id,name,email,phone')]);
    }

    /** Approve an application: set a new password and email the login/password to the responsible person. */
    public function approve(Team $team): JsonResponse
    {
        $this->ensureNotArchived($team);

        $team->forceFill([
            'status' => Team::APPROVED, 'approved_at' => now(), 'rejected_at' => null, 'rejection_reason' => null, 'rejection' => null,
        ])->save();

        return $this->issuePassword($team, reset: false, message: "{$team->country} jamoasi tasdiqlandi.");
    }

    /** Set a new password (e.g. the responsible person lost it) and email it. */
    public function resetPassword(Team $team): JsonResponse
    {
        $this->ensureNotArchived($team);
        abort_unless($team->isApproved(), 422, 'Avval jamoani tasdiqlang.');

        return $this->issuePassword($team, reset: true, message: 'Yangi parol yaratildi.');
    }

    /**
     * Reject an application. The organisers pick standard reasons (translated in the email)
     * and may add a comment in English, Russian and/or Uzbek.
     */
    public function reject(Request $request, Team $team): JsonResponse
    {
        $this->ensureNotArchived($team);
        $data = $request->validate([
            'reasons' => ['nullable', 'array'],
            'reasons.*' => ['string', Rule::in(array_keys(Team::REJECTION_REASONS))],
            'comment' => ['nullable', 'array'],
            'comment.en' => ['nullable', 'string', 'max:500'],
            'comment.ru' => ['nullable', 'string', 'max:500'],
            'comment.uz' => ['nullable', 'string', 'max:500'],
        ]);

        $reasons = array_values(array_unique($data['reasons'] ?? []));
        $comment = array_filter(array_map(fn ($v) => trim((string) $v), $data['comment'] ?? []), fn ($v) => $v !== '');

        // Short Uzbek summary for the admin panel and the CSV export
        $summary = implode(' ', array_merge(
            array_map(fn ($r) => Team::REJECTION_REASONS[$r]['uz'], $reasons),
            $comment ? [$comment['uz'] ?? reset($comment)] : [],
        ));

        $team->forceFill([
            'status' => Team::REJECTED, 'rejected_at' => now(),
            'rejection' => ['reasons' => $reasons, 'comment' => (object) $comment],
            'rejection_reason' => $summary !== '' ? Str::limit($summary, 495) : null,
        ])->save();
        $team->user->tokens()->delete();

        $sent = $this->send(fn () => $team->user->notify(new TeamRejected($team)));

        return response()->json(['message' => "{$team->country} arizasi rad etildi.", 'team' => $team->fresh(), 'email_sent' => $sent]);
    }

    /** Qulflangan jamoani qayta ochish (xato topilganda) */
    public function reopen(Team $team): JsonResponse
    {
        $team->forceFill(['submitted_at' => null])->save();   // submitted_at is not mass-assignable

        $this->send(fn () => $team->user->notify(new TeamReopened($team)));

        return response()->json(['message' => "{$team->country} jamoasi qayta ochildi.", 'team' => $team]);
    }

    public function archive(Team $team): JsonResponse
    {
        if (!$team->isArchived()) {
            $team->forceFill(['archived_at' => now()])->save();
            $team->user->tokens()->delete();
        }

        return response()->json(['message' => "{$team->country} arxivlandi.", 'team' => $team->fresh()]);
    }

    public function unarchive(Team $team): JsonResponse
    {
        $conflict = Team::active()->where('id', '!=', $team->id)
            ->where(fn ($q) => $q->where('country', $team->country)->orWhere('user_id', $team->user_id))
            ->exists();
        if ($conflict) {
            throw ValidationException::withMessages(['team' => ['Bu davlat yoki mas\'ul shaxsning faol jamoasi bor — avval uni arxivlang.']]);
        }

        $team->forceFill(['archived_at' => null])->save();

        return response()->json(['message' => "{$team->country} arxivdan qaytarildi.", 'team' => $team->fresh()]);
    }

    /**
     * Delete a team permanently: its participants, their uploaded passport scans and photos,
     * and the responsible person's account (unless it is an admin or still has another team).
     */
    public function destroyTeam(Team $team): JsonResponse
    {
        $user = $team->user;
        $country = $team->country;
        $teamId = $team->id;

        $userDeleted = DB::transaction(function () use ($team, $user) {
            $team->participants()->delete();
            $team->delete();

            if ($user && !$user->is_admin && !$user->teams()->exists()) {
                $user->tokens()->delete();
                DB::table('password_reset_tokens')->where('email', $user->email)->delete();
                $user->delete();

                return true;
            }

            return false;
        });

        Storage::disk('local')->deleteDirectory("participants/{$teamId}");

        return response()->json(['message' => "{$country} o'chirildi.", 'user_deleted' => $userDeleted]);
    }

    /** Start a new season: archive every active team at once. */
    public function archiveAll(): JsonResponse
    {
        $count = DB::transaction(function () {
            $teams = Team::active()->with('user')->get();
            foreach ($teams as $team) {
                $team->forceFill(['archived_at' => now()])->save();
                if (!$team->user->is_admin) $team->user->tokens()->delete();
            }

            return $teams->count();
        });

        return response()->json(['message' => "{$count} ta jamoa arxivlandi.", 'archived' => $count]);
    }

    // ---------------------------------------------------------------- settings

    public function settings(): JsonResponse
    {
        return response()->json(Olympiad::forPublic());
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'edition' => ['required', 'string', 'max:20'],
            'year' => ['required', 'integer', 'between:2000,2100'],
            'name' => ['required', 'array'],
            'name.en' => ['required', 'string', 'max:200'],
            'name.ru' => ['required', 'string', 'max:200'],
            'name.uz' => ['required', 'string', 'max:200'],
            'city' => ['required', 'array'],
            'city.en' => ['required', 'string', 'max:100'],
            'city.ru' => ['required', 'string', 'max:100'],
            'city.uz' => ['required', 'string', 'max:100'],
            'country' => ['required', 'array'],
            'country.en' => ['required', 'string', 'max:100'],
            'country.ru' => ['required', 'string', 'max:100'],
            'country.uz' => ['required', 'string', 'max:100'],
            'starts_on' => ['required', 'date_format:Y-m-d'],
            'ends_on' => ['required', 'date_format:Y-m-d', 'after_or_equal:starts_on'],
            'registration_opens_on' => ['nullable', 'date_format:Y-m-d'],
            'registration_closes_on' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:registration_opens_on'],
        ]);

        Setting::write('olympiad', $data);

        return response()->json(Olympiad::forPublic());
    }

    // ---------------------------------------------------------------- files & export

    public function file(string $participant, string $type): StreamedResponse
    {
        $model = Participant::findOrFail($participant);
        $path = $type === 'passport' ? $model->passport_scan_path : $model->face_photo_path;

        abort_if(!$path || !Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->download($path);
    }

    /** Barcha jamoalar ishtirokchilari — CSV (Excel UTF-8 BOM bilan to'g'ri ochadi) */
    public function exportCsv(): StreamedResponse
    {
        $filename = 'iao_participants_' . now()->format('Ymd_His') . '.csv';

        return response()->streamDownload(function () {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, array_merge(['country', 'team_submitted'], self::CSV_COLUMNS));

            $query = Participant::with('team')
                ->whereHas('team', fn ($q) => $q->whereNull('archived_at'))
                ->orderBy('team_id')->orderBy('id');

            foreach ($query->cursor() as $p) {
                $row = [$p->team->country, $p->team->isSubmitted() ? 'yes' : 'no'];
                foreach (self::CSV_COLUMNS as $col) {
                    $v = $p->{$col};
                    if ($v instanceof \Carbon\CarbonInterface) $v = $col === 'paid_at' ? $v->format('d.m.Y H:i') : $v->format('d.m.Y');
                    if (is_bool($v)) $v = $v ? 'yes' : 'no';
                    $row[] = self::safeCell($v);
                }
                fputcsv($out, $row);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    // ---------------------------------------------------------------- helpers

    private function issuePassword(Team $team, bool $reset, string $message): JsonResponse
    {
        $password = self::newPassword();
        $user = $team->user;
        $user->forceFill(['password' => $password, 'email_verified_at' => $user->email_verified_at ?? now()])->save();
        $user->tokens()->delete();

        $sent = $this->send(fn () => $user->notify(new TeamCredentials($team, $password, $reset)));

        // The password is returned once so the organisers can pass it on if the email does not arrive.
        return response()->json([
            'message' => $message,
            'team' => $team->fresh()->load('user:id,name,email,phone'),
            'login' => $user->email,
            'password' => $password,
            'email_sent' => $sent,
        ]);
    }

    private static function newPassword(int $length = 12): string
    {
        $alphabet = self::PASSWORD_ALPHABET;
        $out = '';
        for ($i = 0; $i < $length; $i++) {
            $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        return $out;
    }

    private function ensureNotArchived(Team $team): void
    {
        abort_if($team->isArchived(), 422, 'Arxivdagi jamoa — avval arxivdan qaytaring.');
    }

    private function send(callable $fn): bool
    {
        try {
            $fn();
            return true;
        } catch (\Throwable $e) {
            report($e);
            return false;
        }
    }

    /** CSV-injection himoyasi: =, @ bilan boshlansa yoki telefon bo'lmagan +/- bo'lsa — oldiga ' qo'yiladi */
    private static function safeCell(mixed $v): mixed
    {
        if (!is_string($v) || $v === '') return $v;

        $first = $v[0];
        if ($first === '=' || $first === '@' || $first === "\t" || $first === "\r") return "'" . $v;
        if (($first === '+' || $first === '-') && !preg_match('/^[+\-][0-9 ()\-]+$/', $v)) return "'" . $v;

        return $v;
    }
}
