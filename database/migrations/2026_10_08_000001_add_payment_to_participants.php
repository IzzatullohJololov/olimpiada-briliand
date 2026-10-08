<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ishtirokchi to'lovi: tashkilotchilar har bir ishtirokchi uchun "to'lov qildi / qilmadi" belgisini qo'yadi.
 * Jamoa mas'uli bu maydonlarni o'zgartira olmaydi, faqat ko'radi.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            $table->boolean('is_paid')->default(false)->after('needs_visa_invitation')->index(); // to'lov qilindi
            $table->timestamp('paid_at')->nullable()->after('is_paid');                          // to'lov belgilangan vaqt
            $table->string('payment_note', 255)->nullable()->after('paid_at');                  // tashkilotchilar izohi (kvitansiya raqami va h.k.)
        });
    }

    public function down(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            $table->dropIndex(['is_paid']);
            $table->dropColumn(['is_paid', 'paid_at', 'payment_note']);
        });
    }
};
