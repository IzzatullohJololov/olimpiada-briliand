<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The IAO team code ("UG", "AU", ...). It goes into the application form (column "Code") and names its sheet.
 * Codes of new countries are assigned by the organisers, so it is edited in the admin panel.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->string('iao_code', 3)->nullable()->after('country');
        });
    }

    public function down(): void
    {
        Schema::table('teams', fn (Blueprint $table) => $table->dropColumn('iao_code'));
    }
};
