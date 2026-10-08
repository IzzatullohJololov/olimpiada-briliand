<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class MakeAdmin extends Command
{
    protected $signature = 'iao:make-admin {email : Mavjud foydalanuvchi emaili}';
    protected $description = 'Foydalanuvchini administrator qiladi';

    public function handle(): int
    {
        $user = User::where('email', $this->argument('email'))->first();

        if (!$user) {
            $this->error('Bunday foydalanuvchi topilmadi. Avval /api/auth/register orqali ro\'yxatdan o\'ting.');
            return self::FAILURE;
        }

        $user->forceFill(['is_admin' => true])->save();
        $this->info("{$user->email} endi administrator.");

        return self::SUCCESS;
    }
}
