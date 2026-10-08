<?php

namespace App\Models;

use App\Support\Olympiad;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Team extends Model
{
    public const PENDING = 'pending';
    public const APPROVED = 'approved';
    public const REJECTED = 'rejected';

    /** Standard rejection reasons, translated for the three-language emails. */
    public const REJECTION_REASONS = [
        'duplicate' => [
            'en' => 'A team of this country has already been registered.',
            'ru' => 'Команда этой страны уже зарегистрирована.',
            'uz' => 'Bu davlat jamoasi allaqachon roʻyxatdan oʻtgan.',
        ],
        'not_official' => [
            'en' => 'The application was not submitted by an official representative of the country’s team.',
            'ru' => 'Заявка подана не официальным представителем команды страны.',
            'uz' => 'Ariza mamlakat jamoasining rasmiy vakili tomonidan topshirilmagan.',
        ],
        'wrong_country' => [
            'en' => 'The country (team name) is written incorrectly.',
            'ru' => 'Название страны (команды) указано неверно.',
            'uz' => 'Davlat (jamoa) nomi notoʻgʻri yozilgan.',
        ],
        'contacts' => [
            'en' => 'The contact details are incomplete or incorrect.',
            'ru' => 'Контактные данные неполные или неверные.',
            'uz' => 'Aloqa maʼlumotlari toʻliq emas yoki notoʻgʻri.',
        ],
        'late' => [
            'en' => 'The application was submitted after the registration deadline.',
            'ru' => 'Заявка подана после окончания срока регистрации.',
            'uz' => 'Ariza roʻyxatga olish muddati tugaganidan keyin topshirilgan.',
        ],
    ];

    protected $fillable = ['user_id', 'country'];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
            'archived_at' => 'datetime',
            'rejection' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function participants(): HasMany
    {
        return $this->hasMany(Participant::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('archived_at');
    }

    public function isSubmitted(): bool
    {
        return $this->submitted_at !== null;
    }

    public function isApproved(): bool
    {
        return $this->status === self::APPROVED;
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }

    /** Xabar oluvchi tashkilotchilar: .env dagi ro'yxat, bo'sh bo'lsa — administratorlar */
    public static function organizerEmails(): array
    {
        $emails = config('iao.organizer_emails');

        return $emails ?: User::where('is_admin', true)->pluck('email')->all();
    }

    /** The registration window set in the admin panel has closed: teams can no longer change their lists. */
    public static function deadlinePassed(): bool
    {
        return Olympiad::registrationStatus() === 'closed';
    }
}
