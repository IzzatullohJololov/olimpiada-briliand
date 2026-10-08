<?php

namespace App\Providers;

use App\Support\TriMail;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // API-only loyihada 'password.reset' veb-marshruti yo'q, shuning uchun havola frontendga olib boradi:
        // {frontend}/reset-password?token=...&email=...
        ResetPassword::createUrlUsing(function ($user, string $token) {
            return config('iao.frontend_url') . '/reset-password?' . http_build_query([
                'token' => $token,
                'email' => $user->getEmailForPasswordReset(),
            ]);
        });

        // Parolni tiklash xati — uch tilda (English, Русский, Oʻzbekcha)
        ResetPassword::toMailUsing(function ($user, string $token) {
            $url = config('iao.frontend_url') . '/reset-password?' . http_build_query([
                'token' => $token,
                'email' => $user->getEmailForPasswordReset(),
            ]);
            $min = (int) config('auth.passwords.' . config('auth.defaults.passwords') . '.expire', 60);
            $hi = TriMail::greetings($user->name);

            return TriMail::make(
                ['en' => 'Password reset', 'ru' => 'Сброс пароля', 'uz' => 'Parolni tiklash'],
                [
                    'en' => [$hi['en'], 'We received a request to reset the password of your account.',
                        "The link below is valid for {$min} minutes. If you did not request a reset, simply ignore this email."],
                    'ru' => [$hi['ru'], 'Мы получили запрос на сброс пароля вашей учётной записи.',
                        "Ссылка ниже действительна {$min} минут. Если вы не запрашивали сброс, просто проигнорируйте это письмо."],
                    'uz' => [$hi['uz'], 'Hisobingiz parolini tiklash boʻyicha soʻrov oldik.',
                        "Quyidagi havola {$min} daqiqa amal qiladi. Agar siz soʻramagan boʻlsangiz, bu xatga eʼtibor bermang."],
                ],
                ['url' => $url, 'text' => ['en' => 'Reset password', 'ru' => 'Сбросить пароль', 'uz' => 'Parolni tiklash']],
            );
        });
    }
}
