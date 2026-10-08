<?php

namespace App\Notifications;

use App\Models\Team;
use App\Support\Olympiad;
use App\Support\TriMail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** To the responsible person: the application was received and is waiting for approval. */
class RegistrationReceived extends Notification
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
            ['en' => 'Application received', 'ru' => 'Заявка получена', 'uz' => 'Ariza qabul qilindi'],
            [
                'en' => [$hi['en'],
                    "We have received the application of the team of {$c} for the " . Olympiad::title('en') . '.',
                    'The Organising Committee will review it. After approval you will receive your login and password by email.'],
                'ru' => [$hi['ru'],
                    "Заявка команды «{$c}» на " . Olympiad::title('ru') . ' получена.',
                    'Оргкомитет рассмотрит её. После подтверждения вы получите логин и пароль по электронной почте.'],
                'uz' => [$hi['uz'],
                    "{$c} jamoasining arizasi qabul qilindi: " . Olympiad::title('uz') . '.',
                    'Tashkiliy qoʻmita uni koʻrib chiqadi. Tasdiqlangach, login va parol elektron pochtangizga yuboriladi.'],
            ],
            suffix: $c,
        );
    }
}
