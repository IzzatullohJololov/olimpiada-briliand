<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_admin')->default(false)->after('password');
        });

        Schema::table('teams', function (Blueprint $table) {
            $table->timestamp('submitted_at')->nullable()->after('country'); // yakuniy yuborilgan vaqt
        });
    }

    public function down(): void
    {
        Schema::table('teams', fn (Blueprint $t) => $t->dropColumn('submitted_at'));
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('is_admin'));
    }
};
