<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * - Teams are approved by the organisers before the responsible person can sign in.
 * - Teams can be archived (e.g. at the end of a season); an archived country or email may register again.
 * - Olympiad settings (name, dates, registration window) are edited in the admin panel.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 50)->nullable()->after('email');
        });

        Schema::table('teams', function (Blueprint $table) {
            $table->string('status', 20)->default('pending')->after('country')->index(); // pending | approved | rejected
            $table->timestamp('approved_at')->nullable()->after('status');
            $table->timestamp('rejected_at')->nullable()->after('approved_at');
            $table->string('rejection_reason', 500)->nullable()->after('rejected_at');
            $table->timestamp('archived_at')->nullable()->after('submitted_at')->index();
        });

        // One user may have teams in several seasons; uniqueness now applies to active teams only (checked in code).
        Schema::table('teams', function (Blueprint $table) {
            $table->index('user_id', 'teams_user_id_index');
            $table->index('country', 'teams_country_index');
        });
        Schema::table('teams', function (Blueprint $table) {
            $table->dropUnique('teams_user_id_unique');
            $table->dropUnique('teams_country_unique');
        });

        // Teams that already exist were created with their own password: treat them as approved.
        DB::table('teams')->update(['status' => 'approved', 'approved_at' => DB::raw('created_at')]);

        Schema::create('settings', function (Blueprint $table) {
            $table->string('key', 100)->primary();
            $table->json('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');

        Schema::table('teams', function (Blueprint $table) {
            $table->unique('user_id', 'teams_user_id_unique');
            $table->unique('country', 'teams_country_unique');
        });
        Schema::table('teams', function (Blueprint $table) {
            $table->dropIndex('teams_user_id_index');
            $table->dropIndex('teams_country_index');
            $table->dropColumn(['status', 'approved_at', 'rejected_at', 'rejection_reason', 'archived_at']);
        });

        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('phone'));
    }
};
