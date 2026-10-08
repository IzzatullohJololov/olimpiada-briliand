<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Rejection details: standard reasons (translated in the emails) and a comment per language. */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->json('rejection')->nullable()->after('rejection_reason'); // {"reasons":[…],"comment":{"en":…,"ru":…,"uz":…}}
        });
    }

    public function down(): void
    {
        Schema::table('teams', fn (Blueprint $table) => $table->dropColumn('rejection'));
    }
};
