<?php

namespace App\Support;

use App\Models\Setting;
use Carbon\Carbon;

/** Olympiad details and the registration window, as set by the organisers in the admin panel. */
final class Olympiad
{
    /** Dates are entered and compared in Uzbekistan time. */
    public const TZ = 'Asia/Tashkent';

    public static function defaults(): array
    {
        return [
            'edition' => 'XXX',
            'year' => 2026,
            'name' => [
                'en' => 'XXX International Astronomy Olympiad',
                'ru' => 'XXX Международная астрономическая олимпиада',
                'uz' => 'XXX Xalqaro astronomiya olimpiadasi',
            ],
            'city' => ['en' => 'Andizhan', 'ru' => 'Андижан', 'uz' => 'Andijon'],
            'country' => ['en' => 'Uzbekistan', 'ru' => 'Узбекистан', 'uz' => 'Oʻzbekiston'],
            'starts_on' => '2026-12-06',
            'ends_on' => '2026-12-14',
            'registration_opens_on' => null,
            'registration_closes_on' => config('iao.registration_deadline'),
        ];
    }

    public static function settings(): array
    {
        return array_replace_recursive(self::defaults(), Setting::read('olympiad', []) ?? []);
    }

    /** not_open | open | closed */
    public static function registrationStatus(?array $s = null): string
    {
        $s ??= self::settings();
        $now = now(self::TZ);

        if (!empty($s['registration_opens_on']) && $now->lt(Carbon::parse($s['registration_opens_on'], self::TZ)->startOfDay())) {
            return 'not_open';
        }
        if (!empty($s['registration_closes_on']) && $now->gt(Carbon::parse($s['registration_closes_on'], self::TZ)->endOfDay())) {
            return 'closed';
        }

        return 'open';
    }

    /** Public view for the website. */
    public static function forPublic(): array
    {
        $s = self::settings();

        return $s + ['registration_status' => self::registrationStatus($s), 'timezone' => self::TZ];
    }

    /** "XXX International Astronomy Olympiad (Andizhan, 06.12–14.12.2026)" for emails. */
    public static function title(string $lang = 'en'): string
    {
        $s = self::settings();
        $dates = Carbon::parse($s['starts_on'])->format('d.m') . '–' . Carbon::parse($s['ends_on'])->format('d.m.Y');

        return "{$s['name'][$lang]} ({$s['city'][$lang]}, {$dates})";
    }

    public static function shortName(): string
    {
        return 'IAO ' . self::settings()['year'];
    }
}
