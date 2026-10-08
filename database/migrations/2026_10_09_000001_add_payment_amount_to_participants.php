<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** To'lov summasi va valyutasi (tashkilotchilar kiritadi). */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            $table->decimal('payment_amount', 12, 2)->nullable()->after('payment_note');
            $table->string('payment_currency', 3)->nullable()->after('payment_amount'); // USD, EUR, UZS ...
        });
    }

    public function down(): void
    {
        Schema::table('participants', fn (Blueprint $table) => $table->dropColumn(['payment_amount', 'payment_currency']));
    }
};
