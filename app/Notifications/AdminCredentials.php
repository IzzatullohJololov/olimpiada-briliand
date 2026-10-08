<?php

namespace App\Notifications;

use App\Support\Olympiad;
use App\Support\TriMail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Admin paneli foydalanuvchisiga: yangi hisob yoki yangi parol. Panel manzili maxfiy, xatda ko'rsatilmaydi. */
class AdminCredentials extends Notification
{
    public function __construct(private string $password, private bool $reset = false) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $hi = TriMail::greetings($notifiable->name);
        $login = $notifiable->email;
        $pw = $this->password;
        $name = Olympiad::shortName();

        $intro = $this->reset
            ? ['en' => "A new password has been set for your {$name} administration account.",
               'ru' => "Для вашей учётной записи администратора {$name} установлен новый пароль.",
               'uz' => "{$name} boshqaruv hisobingiz uchun yangi parol oʻrnatildi."]
            : ['en' => "You have been given access to the {$name} administration panel.",
               'ru' => "Вам предоставлен доступ к панели администратора {$name}.",
               'uz' => "Sizga {$name} boshqaruv paneliga kirish huquqi berildi."];

        return TriMail::make(
            $this->reset
                ? ['en' => 'New password', 'ru' => 'Новый пароль', 'uz' => 'Yangi parol']
                : ['en' => 'Administration access', 'ru' => 'Доступ администратора', 'uz' => 'Administrator huquqi'],
            [
                'en' => [$hi['en'], $intro['en'], "Login: **{$login}**", "Password: **{$pw}**",
                    'The address of the panel is given to you by the organisers separately.'],
                'ru' => [$hi['ru'], $intro['ru'], "Логин: **{$login}**", "Пароль: **{$pw}**",
                    'Адрес панели организаторы сообщают отдельно.'],
                'uz' => [$hi['uz'], $intro['uz'], "Login: **{$login}**", "Parol: **{$pw}**",
                    'Panel manzilini tashkilotchilar alohida aytadi.'],
            ],
        );
    }
}
