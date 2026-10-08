<?php

namespace App\Notifications;

use App\Models\Team;
use App\Support\Olympiad;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Tashkilotchilarga: yangi jamoa ariza topshirdi, admin panelda tasdiqlash kerak */
class NewTeamApplication extends Notification
{
    public function __construct(private Team $team) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $user = $this->team->user;

        return (new MailMessage)
            ->subject(Olympiad::shortName() . ": yangi ariza — {$this->team->country}")
            ->line("Jamoa: {$this->team->country}")
            ->line("Mas'ul shaxs: {$user->name} <{$user->email}>" . ($user->phone ? ", tel. {$user->phone}" : ''))
            ->line('Ariza vaqti: ' . $this->team->created_at?->timezone(Olympiad::TZ)->format('d.m.Y H:i'))
            ->line("Arizani admin panelda tasdiqlang yoki rad eting. Tasdiqlangach, login va parol mas'ul shaxsga avtomatik yuboriladi.")
            ->salutation(Olympiad::shortName() . ' — roʻyxatga olish tizimi');
    }
}
