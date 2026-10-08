<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Models\Team;
use App\Models\User;
use App\Notifications\NewTeamApplication;
use App\Notifications\RegistrationReceived;
use App\Support\Olympiad;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Jamoa arizasi: user + team (status=pending) yaratiladi, parol berilmaydi.
     * Tashkilotchilar admin panelda tasdiqlagach, login va parol mas'ul shaxsga emailda yuboriladi.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $status = Olympiad::registrationStatus();
        if ($status !== 'open') {
            return response()->json([
                'message' => $status === 'closed' ? "Ro'yxatdan o'tish muddati tugagan." : "Ro'yxatdan o'tish hali boshlanmagan.",
                'code' => $status === 'closed' ? 'registration_closed' : 'registration_not_open',
            ], 423);
        }

        $data = $request->validated();
        $existing = User::where('email', $data['email'])->first();

        // A responsible person from a previous (archived) season may apply again with the same email.
        if ($existing && ($existing->is_admin || $existing->team)) {
            throw ValidationException::withMessages(['email' => ['The email has already been taken.']]);
        }

        $team = DB::transaction(function () use ($data, $existing) {
            $user = $existing ?? new User();
            $user->fill(['name' => $data['name'], 'email' => $data['email'], 'phone' => $data['phone']]);
            $user->password = Str::random(64);   // nobody knows it until the organisers approve the team
            $user->save();

            return Team::create(['user_id' => $user->id, 'country' => $data['country']]);
        });
        $team->refresh()->load('user');

        $this->notifySafely(function () use ($team) {
            $team->user->notify(new RegistrationReceived($team));
            if ($emails = Team::organizerEmails()) {
                Notification::route('mail', $emails)->notify(new NewTeamApplication($team));
            }
        });

        return response()->json([
            'message' => 'Ariza qabul qilindi. Tasdiqlangandan keyin login va parol emailingizga yuboriladi.',
            'status' => $team->status,
            'email' => $team->user->email,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (!Auth::attempt($credentials)) {
            throw ValidationException::withMessages(['email' => ['Email yoki parol noto\'g\'ri.']]);
        }

        $user = $request->user();

        // Team accounts sign in only after approval and while the team is not archived.
        if (!$user->is_admin) {
            $team = $user->team;
            $code = match (true) {
                !$team => 'account_archived',
                $team->status === Team::PENDING => 'account_pending',
                $team->status === Team::REJECTED => 'account_rejected',
                default => null,
            };
            if ($code) {
                // No token is issued; API requests are stateless, so nothing else needs to be undone.
                return response()->json(['message' => 'Hisob faol emas.', 'code' => $code], 403);
            }
        }

        return response()->json([
            'user' => $user->load('team'),
            'token' => $user->createToken('api')->plainTextToken,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Chiqildi.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('team'));
    }

    /** Email havolasi (imzolangan URL): GET /api/auth/email/verify/{id}/{hash} — token talab qilinmaydi */
    public function verifyEmail(Request $request, string $id, string $hash): JsonResponse|RedirectResponse
    {
        $user = User::findOrFail($id);

        abort_unless(hash_equals(sha1($user->getEmailForVerification()), $hash), 403, 'Havola noto\'g\'ri.');

        if (!$user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        // Frontend bo'lsa o'shanga yo'naltiramiz, bo'lmasa JSON
        if ($request->boolean('json') || !config('iao.frontend_url')) {
            return response()->json(['message' => 'Email tasdiqlandi.']);
        }

        return redirect()->away(config('iao.frontend_url') . '/email-verified');
    }

    public function resendVerification(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email allaqachon tasdiqlangan.']);
        }

        $this->notifySafely(fn () => $user->sendEmailVerificationNotification());

        return response()->json(['message' => 'Tasdiqlash havolasi qayta yuborildi.']);
    }

    /** Parolni tiklash havolasini yuborish. Email bor-yo'qligini oshkor qilmaydi (har doim bir xil javob). */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        Password::sendResetLink($request->only('email'));

        return response()->json(['message' => 'Agar bu email ro\'yxatdan o\'tgan bo\'lsa, parolni tiklash havolasi yuborildi.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        $status = Password::reset($data + ['password_confirmation' => $request->input('password_confirmation')],
            function (User $user, string $password) {
                $user->forceFill(['password' => $password])->save();
                $user->tokens()->delete();                       // barcha eski tokenlar bekor
                event(new PasswordReset($user));
            });

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => ['Havola yaroqsiz yoki muddati tugagan.']]);
        }

        return response()->json(['message' => 'Parol yangilandi. Qaytadan kiring.']);
    }

    /** Xat yuborilmay qolsa ham amal bekor bo'lmaydi: xato yoziladi, xolos */
    private function notifySafely(callable $send): void
    {
        try {
            $send();
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
