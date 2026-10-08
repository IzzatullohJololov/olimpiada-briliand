<?php

namespace App\Notifications;

use App\Models\Team;
use App\Support\TriMail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Jamoaga: ro'yxat tashkilotchi tomonidan qayta ochildi */
class TeamReopened extends Notification
{
    public function __construct(private Team $team) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $c = $this->team->country;
        $hi = TriMail::greetings($notifiable->name);

        return TriMail::make(
            ['en' => 'List reopened', 'ru' => 'Список снова открыт', 'uz' => 'Roʻyxat qayta ochildi'],
            [
                'en' => [$hi['en'], "The Organising Committee has reopened the list of the team of {$c} for editing.",
                    'Make the necessary changes and submit the final list again.'],
                'ru' => [$hi['ru'], "Оргкомитет снова открыл список команды «{$c}» для редактирования.",
                    'Внесите необходимые изменения и снова отправьте окончательный список.'],
                'uz' => [$hi['uz'], "Tashkiliy qoʻmita {$c} jamoasi roʻyxatini tahrirlash uchun qayta ochdi.",
                    'Kerakli oʻzgartirishlarni kiriting va yakuniy roʻyxatni qaytadan yuboring.'],
            ],
            TriMail::signIn(),
            suffix: $c,
        );
    }
}
