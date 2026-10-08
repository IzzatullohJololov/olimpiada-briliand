<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Admin paneli foydalanuvchilari va ruxsatlari.
 * `admin_permissions` — ruxsat kalitlari ro'yxati (JSON), `["*"]` — hammasi.
 * Mavjud administratorlar to'liq huquq oladi.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('admin_permissions')->nullable()->after('is_admin');
        });

        DB::table('users')->where('is_admin', true)->update(['admin_permissions' => json_encode(['*'])]);
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('admin_permissions'));
    }
};
