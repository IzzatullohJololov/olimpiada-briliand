<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\AdminCredentials;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Admin paneli foydalanuvchilari (ruxsat: `users`).
 * Har bir administrator jamoalarni ko'ra oladi; qolgan amallar User::PERMISSIONS bo'yicha beriladi.
 */
class AdminUserController extends Controller
{
    private const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

    /** Ruxsatlar lug'ati — frontend formasi uchun */
    public function permissions(): JsonResponse
    {
        return response()->json(['all' => User::ALL, 'permissions' => User::PERMISSIONS]);
    }

    public function index(): JsonResponse
    {
        $users = User::where('is_admin', true)->orderBy('name')->get();

        return response()->json($users->map(fn ($u) => self::item($u))->values());
    }

    /**
     * Yangi administrator. Parol berilmasa — yaratiladi, bir marta javobda qaytadi va emailga yuboriladi.
     * POST /admin/users { name, email, password?, permissions: ['teams.manage', ...] | ['*'] }
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['nullable', 'string', 'min:8', 'max:100'],
            ...self::permissionRules(),
        ]);

        $password = $data['password'] ?? self::newPassword();

        $user = DB::transaction(function () use ($data, $password) {
            $user = new User(['name' => $data['name'], 'email' => $data['email']]);
            $user->password = $password;
            $user->email_verified_at = now();   // administratorlar emailni tasdiqlamaydi
            $user->save();

            return $user->setAdminPermissions($data['permissions']);
        });

        $sent = $this->send(fn () => $user->notify(new AdminCredentials($password, reset: false)));

        return response()->json([
            'message' => "{$user->email} administrator sifatida qo'shildi.",
            'user' => self::item($user),
            'login' => $user->email,
            'password' => $password,
            'email_sent' => $sent,
        ], 201);
    }

    /**
     * Ism va ruxsatlarni o'zgartirish. O'zining `users` ruxsatini olib tashlab bo'lmaydi.
     * PATCH /admin/users/{user} { name?, permissions? }
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $this->ensureAdmin($user);
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            ...self::permissionRules(sometimes: true),
        ]);

        if (array_key_exists('permissions', $data)) {
            $perms = User::normalizePermissions($data['permissions']);
            $keepsUsers = in_array(User::ALL, $perms, true) || in_array('users', $perms, true);
            if ($user->is($request->user()) && !$keepsUsers) {
                throw ValidationException::withMessages(['permissions' => ['O\'zingizning foydalanuvchilarni boshqarish ruxsatingizni olib tashlab bo\'lmaydi.']]);
            }
            $user->setAdminPermissions($perms);
        }
        if (isset($data['name'])) {
            $user->forceFill(['name' => $data['name']])->save();
        }

        return response()->json(['message' => 'Saqlandi.', 'user' => self::item($user->fresh())]);
    }

    /** Yangi parol: yaratiladi, bir marta javobda qaytadi, emailga yuboriladi, eski tokenlar bekor qilinadi. */
    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $this->ensureAdmin($user);
        $password = self::newPassword();
        $user->forceFill(['password' => $password])->save();
        if (!$user->is($request->user())) {
            $user->tokens()->delete();
        }

        $sent = $this->send(fn () => $user->notify(new AdminCredentials($password, reset: true)));

        return response()->json([
            'message' => 'Yangi parol yaratildi.',
            'user' => self::item($user),
            'login' => $user->email,
            'password' => $password,
            'email_sent' => $sent,
        ]);
    }

    /** Administratorni o'chirish (o'zini va oxirgi bosh administratorni o'chirib bo'lmaydi). */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->ensureAdmin($user);
        if ($user->is($request->user())) {
            throw ValidationException::withMessages(['user' => ['O\'zingizni o\'chira olmaysiz.']]);
        }
        if ($user->allows('users') && !User::where('is_admin', true)->where('id', '!=', $user->id)->get()->contains(fn ($u) => $u->allows('users'))) {
            throw ValidationException::withMessages(['user' => ['Foydalanuvchilarni boshqara oladigan oxirgi administratorni o\'chirib bo\'lmaydi.']]);
        }

        $email = $user->email;
        DB::transaction(function () use ($user) {
            $user->tokens()->delete();
            if ($user->teams()->exists()) {
                // Avval jamoa mas'uli bo'lgan: akkaunt qoladi, faqat admin huquqi olinadi
                $user->forceFill(['is_admin' => false, 'admin_permissions' => null])->save();
            } else {
                $user->delete();
            }
        });

        return response()->json(['message' => "{$email} administratorlikdan olindi."]);
    }

    // ---------------------------------------------------------------- helpers

    private static function item(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'permissions' => $u->permissions,
            'is_super' => $u->isSuperAdmin(),
            'created_at' => $u->created_at?->toIso8601String(),
        ];
    }

    private static function permissionRules(bool $sometimes = false): array
    {
        $keys = array_merge([User::ALL], array_keys(User::PERMISSIONS));

        return [
            'permissions' => [$sometimes ? 'sometimes' : 'present', 'array'],
            'permissions.*' => ['string', Rule::in($keys)],
        ];
    }

    private function ensureAdmin(User $user): void
    {
        abort_unless($user->is_admin, 404);
    }

    private static function newPassword(int $length = 12): string
    {
        $out = '';
        for ($i = 0; $i < $length; $i++) {
            $out .= self::PASSWORD_ALPHABET[random_int(0, strlen(self::PASSWORD_ALPHABET) - 1)];
        }

        return $out;
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
}
