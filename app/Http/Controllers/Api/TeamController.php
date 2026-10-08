<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Notifications\NewTeamSubmission;
use App\Notifications\TeamSubmitted;
use App\Support\Olympiad;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;

class TeamController extends Controller
{
    /** Viza taklifnomasi so'ralganda to'liq bo'lishi shart bo'lgan maydonlar */
    private const VISA_FIELDS = [
        'passport_number', 'passport_issue_date', 'passport_expiry_date', 'passport_issued_by',
        'passport_scan_path', 'face_photo_path', 'org_address', 'org_contacts',
    ];

    /** Team quota per group and in total (students awarded a I–II Diploma at the last IAO/IRAO do not count). */
    private const QUOTA = ['alpha' => 4, 'beta' => 3, 'gamma' => 2];
    private const QUOTA_TOTAL = 6;

    public function show(Request $request): JsonResponse
    {
        $team = $request->user()->team;

        return response()->json([
            'team' => $team,
            'locked' => $team->isSubmitted() || $team::deadlinePassed(),
            'deadline' => Olympiad::settings()['registration_closes_on'],
            'counts' => [
                'team_leaders' => $team->participants()->whereIn('status', ['team_leader', 'team_leader_jury'])->count(),
                'observers' => $team->participants()->where('status', 'observer')->count(),
                'students' => $team->participants()->where('status', 'student')->count(),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $team = $request->user()->team;

        $data = $request->validate([
            'country' => ['required', 'string', 'max:100', Rule::unique('teams', 'country')->ignore($team->id)],
        ]);

        $team->update($data);

        return response()->json($team);
    }

    /** Ro'yxatni yakuniy yuborish: tekshiradi va jamoani qulflaydi */
    public function submit(Request $request): JsonResponse
    {
        $team = $request->user()->team;
        $participants = $team->participants()->get();
        $errors = [];

        if ($participants->whereIn('status', ['team_leader', 'team_leader_jury'])->isEmpty()) {
            $errors[] = 'Kamida bitta jamoa rahbari kiritilishi kerak.';
        }

        // Quota for IAO/IRAO 2024–2026: up to 6 students (α ≤ 4, β ≤ 3, γ ≤ 2). Students awarded a
        // I–II Diploma at the last IAO/IRAO are accepted beyond it and are not counted.
        $counted = $participants->where('status', 'student')->where('previous_prizewinner', false);
        foreach (self::QUOTA as $group => $max) {
            $n = $counted->where('student_group', $group)->count();
            if ($n > $max) {
                $errors[] = "Kvotadan oshgan: {$group} guruhida {$n} nafar oʻquvchi, kvota {$max} nafar (I–II diplom sovrindorlari kvotaga kirmaydi).";
            }
        }
        if ($counted->count() > self::QUOTA_TOTAL) {
            $errors[] = "Kvotadan oshgan: jami {$counted->count()} nafar oʻquvchi, kvota " . self::QUOTA_TOTAL . ' nafar.';
        }

        foreach ($participants->where('needs_visa_invitation', true) as $p) {
            $missing = array_values(array_filter(self::VISA_FIELDS, fn ($f) => blank($p->{$f})));
            if ($missing) {
                $errors[] = "{$p->family_name_en} {$p->first_name_en}: viza uchun to'ldirilmagan maydonlar — " . implode(', ', $missing);
            }
        }

        if ($errors) {
            return response()->json(['message' => "Yuborish uchun ma'lumotlar to'liq emas.", 'errors' => $errors], 422);
        }

        $team->forceFill(['submitted_at' => now()])->save();   // submitted_at is not mass-assignable
        $team->refresh();

        $this->notifySubmitted($team);

        return response()->json(['message' => 'Ro\'yxat yakuniy yuborildi.', 'team' => $team]);
    }

    /** Xat yuborilmay qolsa ham yuborish bekor bo'lmaydi: xato yoziladi, xolos */
    private function notifySubmitted(Team $team): void
    {
        try {
            $team->user->notify(new TeamSubmitted($team));

            if ($emails = Team::organizerEmails()) {
                Notification::route('mail', $emails)->notify(new NewTeamSubmission($team));
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
