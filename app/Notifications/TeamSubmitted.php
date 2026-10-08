<?php

namespace App\Notifications;

use App\Models\Team;
use App\Support\Olympiad;
use App\Support\TriMail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Jamoaga: ro'yxat yakuniy yuborilgani haqida tasdiq (uch tilda) */
class TeamSubmitted extends Notification
{
    private const ROLES = [
        'team_leader' => 'Team leader · Руководитель команды · Jamoa rahbari',
        'team_leader_jury' => 'Team leader and jury member · Руководитель и член жюри · Jamoa rahbari va hakam',
        'observer' => 'Observer · Наблюдатель · Kuzatuvchi',
        'student' => 'Student · Школьник · Oʻquvchi',
    ];
    private const GROUPS = ['alpha' => 'α', 'beta' => 'β', 'gamma' => 'γ'];

    public function __construct(private Team $team) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $c = $this->team->country;
        $hi = TriMail::greetings($notifiable->name);
        $when = $this->team->submitted_at?->timezone(Olympiad::TZ)->format('d.m.Y H:i');

        $members = ['**Team list · Состав команды · Jamoa tarkibi**'];
        foreach ($this->team->participants()->orderBy('id')->get() as $p) {
            $group = $p->student_group ? ' (' . (self::GROUPS[$p->student_group] ?? $p->student_group) . ')' : '';
            $members[] = "• {$p->family_name_en} {$p->first_name_en} — " . (self::ROLES[$p->status] ?? $p->status) . $group;
        }

        return TriMail::make(
            ['en' => 'List submitted', 'ru' => 'Список отправлен', 'uz' => 'Roʻyxat yuborildi'],
            [
                'en' => [$hi['en'], "The final list of the team of {$c} for the " . Olympiad::title('en') . " has been submitted ({$when}, Tashkent time).",
                    'If anything needs to be corrected, contact the Organising Committee — they will reopen the list.'],
                'ru' => [$hi['ru'], "Окончательный список команды «{$c}» на " . Olympiad::title('ru') . " отправлен ({$when}, по ташкентскому времени).",
                    'Если нужно что-то исправить, свяжитесь с оргкомитетом — он снова откроет список.'],
                'uz' => [$hi['uz'], "{$c} jamoasining yakuniy roʻyxati yuborildi: " . Olympiad::title('uz') . " ({$when}, Toshkent vaqti bilan).",
                    'Biror narsani tuzatish kerak boʻlsa, tashkiliy qoʻmitaga murojaat qiling — ular roʻyxatni qayta ochadi.'],
            ],
            after: $members,
            suffix: $c,
        );
    }
}
