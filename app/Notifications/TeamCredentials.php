<?php

namespace App\Notifications;

use App\Models\Team;
use App\Support\Olympiad;
use App\Support\TriMail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** To the responsible person: login and password after approval, or a new password set by the organisers. */
class TeamCredentials extends Notification
{
    public function __construct(private Team $team, private string $password, private bool $reset = false) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $c = $this->team->country;
        $hi = TriMail::greetings($notifiable->name);
        $login = $notifiable->email;
        $pw = $this->password;

        $intro = $this->reset
            ? [
                'en' => ["The Organising Committee has set a new password for the account of the team of {$c}."],
                'ru' => ["Оргкомитет установил новый пароль для учётной записи команды «{$c}»."],
                'uz' => ["Tashkiliy qoʻmita {$c} jamoasi hisobi uchun yangi parol oʻrnatdi."],
            ]
            : [
                'en' => ["The application of the team of {$c} for the " . Olympiad::title('en') . ' has been approved.',
                    'Sign in to add the team leaders and the students, and submit the final list before the registration closes.'],
                'ru' => ["Заявка команды «{$c}» на " . Olympiad::title('ru') . ' подтверждена.',
                    'Войдите, чтобы добавить руководителей и школьников, и отправьте окончательный список до окончания регистрации.'],
                'uz' => ["{$c} jamoasining arizasi tasdiqlandi: " . Olympiad::title('uz') . '.',
                    'Tizimga kiring, jamoa rahbarlari va oʻquvchilarni qoʻshing hamda roʻyxatga olish tugaguncha yakuniy roʻyxatni yuboring.'],
            ];

        return TriMail::make(
            $this->reset
                ? ['en' => 'New password', 'ru' => 'Новый пароль', 'uz' => 'Yangi parol']
                : ['en' => 'Application approved', 'ru' => 'Заявка подтверждена', 'uz' => 'Ariza tasdiqlandi'],
            [
                'en' => [$hi['en'], ...$intro['en'], "Login: **{$login}**", "Password: **{$pw}**",
                    'You can change the password at any time with “Forgot your password?” on the sign-in page.'],
                'ru' => [$hi['ru'], ...$intro['ru'], "Логин: **{$login}**", "Пароль: **{$pw}**",
                    'Пароль можно сменить в любое время через «Забыли пароль?» на странице входа.'],
                'uz' => [$hi['uz'], ...$intro['uz'], "Login: **{$login}**", "Parol: **{$pw}**",
                    'Parolni istalgan vaqtda kirish sahifasidagi «Parolni unutdingizmi?» orqali oʻzgartirishingiz mumkin.'],
            ],
            TriMail::signIn(),
            suffix: $c,
        );
    }
}
