<?php

namespace App\Notifications;

use App\Models\Team;
use App\Support\Olympiad;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Tashkilotchilarga: yangi jamoa ro'yxatni yubordi */
class NewTeamSubmission extends Notification
{
    public function __construct(private Team $team) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $p = $this->team->participants();
        $leaders = (clone $p)->whereIn('status', ['team_leader', 'team_leader_jury'])->count();
        $observers = (clone $p)->where('status', 'observer')->count();
        $students = (clone $p)->where('status', 'student')->count();
        $visa = (clone $p)->where('needs_visa_invitation', true)->count();
        $user = $this->team->user;

        return (new MailMessage)
            ->subject(Olympiad::shortName() . ": {$this->team->country} jamoasi ro'yxatni yubordi")
            ->line("Jamoa: {$this->team->country}")
            ->line("Mas'ul shaxs: {$user->name} <{$user->email}>")
            ->line("Jamoa rahbarlari: {$leaders}, kuzatuvchilar: {$observers}, talabalar: {$students}")
            ->line("Viza taklifnomasi so'ragan ishtirokchilar: {$visa}")
            ->line('Yuborilgan vaqt: ' . $this->team->submitted_at?->format('d.m.Y H:i'))
            ->salutation(Olympiad::shortName() . ' — roʻyxatga olish tizimi');
    }
}
