<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Participant extends Model
{
    public const STATUSES = ['team_leader', 'team_leader_jury', 'observer', 'student'];
    public const GROUPS = ['alpha', 'beta', 'gamma'];
    public const DIETS = ['standard', 'vegetarian', 'avoid_pork'];
    public const LANGUAGES = ['russian', 'english', 'both'];
    public const TSHIRTS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

    /** To'lov maydonlarini faqat administrator o'zgartiradi (forceFill), jamoa yubora olmaydi */
    /** To'lov valyutalari (admin panelidagi tanlov) */
    public const CURRENCIES = ['USD', 'EUR', 'UZS', 'RUB'];

    protected $guarded = ['id', 'team_id', 'is_paid', 'paid_at', 'payment_note', 'payment_amount', 'payment_currency'];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'passport_issue_date' => 'date',
            'passport_expiry_date' => 'date',
            'previous_prizewinner' => 'boolean',
            'needs_visa_invitation' => 'boolean',
            'is_paid' => 'boolean',
            'paid_at' => 'datetime',
            'payment_amount' => 'decimal:2',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function scopePaid(Builder $query): Builder
    {
        return $query->where('is_paid', true);
    }

    public function scopeUnpaid(Builder $query): Builder
    {
        return $query->where('is_paid', false);
    }

    /**
     * To'lov holatini belgilash. paid_at: to'langan deb belgilanganda bir marta qo'yiladi
     * (qayta saqlashda o'zgarmaydi), bekor qilinganda tozalanadi.
     * Summa va valyuta: null — o'zgarmaydi, '' — tozalanadi.
     */
    public function setPayment(bool $paid, ?string $note = null, string|int|float|null $amount = null, ?string $currency = null): static
    {
        $data = [
            'is_paid' => $paid,
            'paid_at' => $paid ? ($this->paid_at ?? now()) : null,
            'payment_note' => $note !== null && trim($note) !== '' ? trim($note) : null,
        ];
        if ($amount !== null) {
            $data['payment_amount'] = $amount === '' ? null : round((float) $amount, 2);
        }
        if ($currency !== null) {
            $data['payment_currency'] = $currency === '' ? null : strtoupper($currency);
        }
        $finalAmount = array_key_exists('payment_amount', $data) ? $data['payment_amount'] : $this->payment_amount;
        $finalCurrency = array_key_exists('payment_currency', $data) ? $data['payment_currency'] : $this->payment_currency;
        if ($finalAmount !== null && empty($finalCurrency)) {
            $data['payment_currency'] = self::CURRENCIES[0];   // summa bor, valyuta yo'q — USD
        }

        $this->forceFill($data)->save();

        return $this;
    }
}
