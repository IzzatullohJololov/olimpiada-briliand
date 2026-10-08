<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/**
 * Bosh administrator (barcha ruxsatlar). Foydalanuvchi bo'lmasa — yaratiladi va parol ko'rsatiladi.
 * Qolgan administratorlarni admin panelidagi "Foydalanuvchilar" bo'limidan qo'shish mumkin.
 */
class MakeAdmin extends Command
{
    protected $signature = 'iao:make-admin {email : Foydalanuvchi emaili} {--name= : Yangi foydalanuvchi ismi}';
    protected $description = 'Foydalanuvchini bosh administrator qiladi (barcha ruxsatlar); yo\'q bo\'lsa yaratadi';

    public function handle(): int
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();
        $password = null;

        if (!$user) {
            $password = Str::password(12, symbols: false);
            $user = new User(['name' => $this->option('name') ?: 'Administrator', 'email' => $email]);
            $user->password = $password;
            $user->email_verified_at = now();
            $user->save();
        }

        $user->setAdminPermissions([User::ALL]);
        $this->info("{$user->email} endi bosh administrator (barcha ruxsatlar).");
        if ($password) {
            $this->line("Parol: {$password}   (faqat bir marta ko'rsatiladi)");
        }

        return self::SUCCESS;
    }
}
