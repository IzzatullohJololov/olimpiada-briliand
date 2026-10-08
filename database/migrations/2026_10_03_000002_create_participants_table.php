<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();

            // Status: team_leader | team_leader_jury | observer | student
            $table->string('status', 30)->index();
            $table->string('student_group', 10)->nullable();          // alpha | beta | gamma (faqat student)
            $table->boolean('previous_prizewinner')->default(false);  // oldingi IAO I-II diplom sovrindori
            $table->boolean('needs_visa_invitation')->default(false); // 8.1-5, 10.3-4 shunda majburiy

            // 1-5: shaxsiy ma'lumotlar
            $table->string('family_name_en');                  // 1.1
            $table->string('first_name_en');                   // 1.2
            $table->string('family_name_native');              // 2.1
            $table->string('first_name_native');               // 2.2
            $table->date('birth_date');                        // 3
            $table->string('birth_place');                     // 4
            $table->string('sex', 10);                         // 5 male|female

            // 6: fuqarolik, tashriflar
            $table->string('citizenship');                     // 6.1
            $table->string('other_citizenships')->nullable();  // 6.2
            $table->string('ethnicity')->nullable();           // 6.3
            $table->text('previous_visits_uz')->nullable();    // 6.4

            // 8: pasport
            $table->string('passport_number')->nullable();     // 8.1
            $table->date('passport_issue_date')->nullable();   // 8.2
            $table->date('passport_expiry_date')->nullable();  // 8.3
            $table->string('passport_issued_by')->nullable();  // 8.4
            $table->string('passport_scan_path')->nullable();  // 8.6
            $table->string('face_photo_path')->nullable();     // 8.7

            // 9-10: ish/o'qish joyi
            $table->string('position');                        // 9
            $table->string('org_name');                        // 10.1
            $table->string('org_location');                    // 10.2
            $table->string('org_address')->nullable();         // 10.3
            $table->string('org_contacts')->nullable();        // 10.4
            $table->string('graduation_date')->nullable();     // 10.5
            $table->text('previous_olympiads')->nullable();    // 10.6

            // 11: uy
            $table->string('home_location');                   // 11.1
            $table->string('home_address');                    // 11.2
            $table->string('home_phone')->nullable();          // 11.3
            $table->string('mobile_phone');                    // 11.4
            $table->string('email');                           // 11.5

            // 12: tillar
            $table->string('official_language', 20);           // 12.1 russian|english|both
            $table->string('native_languages');                // 12.2

            // 13: ovqat, tibbiyot
            $table->string('diet', 20)->default('standard');   // 13.1 standard|vegetarian|avoid_pork
            $table->text('food_notes')->nullable();            // 13.2
            $table->text('medical_notes')->nullable();         // 13.3
            $table->string('tshirt_size', 5)->nullable();      // 13.4

            // 14: favqulodda aloqa
            $table->string('emergency_family_name');           // 14.1
            $table->string('emergency_first_name');            // 14.2
            $table->string('emergency_relation');              // 14.3
            $table->unsignedTinyInteger('emergency_age')->nullable(); // 14.4
            $table->string('emergency_languages')->nullable(); // 14.5
            $table->string('emergency_phones');                // 14.6
            $table->string('emergency_email')->nullable();     // 14.7
            $table->string('emergency_telegram')->nullable();  // 14.8

            $table->timestamps();

            $table->unique('passport_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('participants');
    }
};
