<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, Notifiable;

    /**
     * Admin paneli ruxsatlari. Har bir administrator jamoalar va ishtirokchilarni ko'ra oladi (CSV/Excel bilan);
     * qolgan amallar uchun alohida ruxsat kerak. '*' — hammasi (bosh administrator).
     */
    public const PERMISSIONS = [
        'teams.manage' => 'Jamoalarni boshqarish: tasdiqlash, rad etish, parol, qayta ochish, arxiv, o\'chirish, IAO kodi',
        'payments' => 'Ishtirokchilar to\'lovini belgilash',
        'settings' => 'Olimpiada sozlamalari va yangi mavsum (hammasini arxivlash)',
        'users' => 'Admin paneli foydalanuvchilarini boshqarish',
    ];
    public const ALL = '*';

    protected $fillable = ['name', 'email', 'phone', 'password'];   // is_admin va admin_permissions ataylab fillable emas

    protected $hidden = ['password', 'remember_token', 'admin_permissions'];

    /** Frontend uchun: ruxsatlar ro'yxati (jamoa foydalanuvchisida bo'sh) */
    protected $appends = ['permissions'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'admin_permissions' => 'array',
        ];
    }

    /** The current (not archived) team of this responsible person. */
    public function team(): HasOne
    {
        return $this->hasOne(Team::class)->ofMany(['id' => 'max'], fn ($q) => $q->whereNull('archived_at'));
    }

    /** All teams, including the archived ones of previous seasons. */
    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }

    // ---------------------------------------------------------------- admin permissions

    public function getPermissionsAttribute(): array
    {
        if (!$this->is_admin) return [];

        return array_values(array_unique(array_map('strval', $this->admin_permissions ?? [])));
    }

    public function isSuperAdmin(): bool
    {
        return $this->is_admin && in_array(self::ALL, $this->permissions, true);
    }

    /** Ruxsat bormi (bosh administratorda hammasi bor) */
    public function allows(string $permission): bool
    {
        if (!$this->is_admin) return false;
        $perms = $this->permissions;

        return in_array(self::ALL, $perms, true) || in_array($permission, $perms, true);
    }

    /** Ruxsatlar ro'yxatini tozalab saqlash: faqat ma'lum kalitlar, '*' bo'lsa — faqat u */
    public static function normalizePermissions(array $permissions): array
    {
        if (in_array(self::ALL, $permissions, true)) return [self::ALL];

        // PERMISSIONS tartibida (kanonik), noma'lum kalitlar tashlab yuboriladi
        return array_values(array_intersect(array_keys(self::PERMISSIONS), $permissions));
    }

    public function setAdminPermissions(array $permissions): static
    {
        $this->forceFill(['is_admin' => true, 'admin_permissions' => self::normalizePermissions($permissions)])->save();

        return $this;
    }
}
