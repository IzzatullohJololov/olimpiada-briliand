<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\User;
use App\Notifications\NewTeamSubmission;
use App\Notifications\TeamReopened;
use App\Notifications\TeamSubmitted;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IaoApiTest extends TestCase
{
    use RefreshDatabase;

    private function makeTeam(string $country = 'Uganda', string $email = 'uganda@example.ug'): User
    {
        $user = User::create(['name' => 'Leader', 'email' => $email, 'password' => 'secret123']);
        $user->forceFill(['email_verified_at' => now()])->save();   // yozish uchun email tasdiqlangan bo'lishi kerak
        Team::create(['user_id' => $user->id, 'country' => $country]);

        return $user;
    }

    private function student(array $override = []): array
    {
        return array_merge([
            'status' => 'student', 'student_group' => 'alpha',
            'family_name_en' => 'Okello', 'first_name_en' => 'Peter James',
            'family_name_native' => 'Okello', 'first_name_native' => 'Peter James',
            'birth_date' => '12.05.2009', 'birth_place' => 'Kampala, Uganda', 'sex' => 'male',
            'citizenship' => 'Ugandan', 'position' => 'Student',
            'org_name' => 'Kampala High School', 'org_location' => 'Kampala, Uganda',
            'home_location' => 'Kampala, Uganda', 'home_address' => 'Plot 5, Kampala',
            'mobile_phone' => '+256700000000', 'email' => 'peter@example.ug',
            'official_language' => 'english', 'native_languages' => 'Luganda',
            'emergency_family_name' => 'Okello', 'emergency_first_name' => 'Mary',
            'emergency_relation' => 'mother', 'emergency_phones' => '+256711111111',
        ], $override);
    }

    private function leader(array $override = []): array
    {
        return $this->student(array_merge([
            'status' => 'team_leader', 'student_group' => null,
            'family_name_en' => 'Mugisha', 'first_name_en' => 'David',
            'family_name_native' => 'Mugisha', 'first_name_native' => 'David',
            'birth_date' => '01.03.1985', 'position' => 'Teacher', 'email' => 'david@example.ug',
        ], $override));
    }

    public function test_register_creates_user_team_and_token(): void
    {
        Notification::fake();

        $this->postJson('/api/auth/register', [
            'name' => 'John', 'email' => 'john@example.ug', 'password' => 'secret123',
            'password_confirmation' => 'secret123', 'country' => 'Uganda',
        ])->assertCreated()->assertJsonStructure(['token', 'user' => ['team' => ['country']]]);

        $this->postJson('/api/auth/register', [
            'name' => 'Other', 'email' => 'other@example.ug', 'password' => 'secret123',
            'password_confirmation' => 'secret123', 'country' => 'Uganda',
        ])->assertStatus(422)->assertJsonValidationErrors('country');
    }

    public function test_student_can_be_created_without_passport_and_diet_defaults(): void
    {
        Sanctum::actingAs($this->makeTeam());

        $this->postJson('/api/participants', $this->student())
            ->assertCreated()
            ->assertJsonPath('data.diet', 'standard')
            ->assertJsonPath('data.birth_date', '12.05.2009');
    }

    public function test_english_names_must_be_latin_and_not_all_caps(): void
    {
        Sanctum::actingAs($this->makeTeam());

        $this->postJson('/api/participants', $this->student(['family_name_en' => 'Окелло']))
            ->assertStatus(422)->assertJsonValidationErrors('family_name_en');

        $this->postJson('/api/participants', $this->student(['first_name_en' => 'PETER JAMES']))
            ->assertStatus(422)->assertJsonValidationErrors('first_name_en');
    }

    public function test_passport_fields_required_only_when_visa_invitation_requested(): void
    {
        Sanctum::actingAs($this->makeTeam());

        $this->postJson('/api/participants', $this->student(['needs_visa_invitation' => true]))
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'passport_number', 'passport_issue_date', 'passport_expiry_date',
                'passport_issued_by', 'passport_scan', 'face_photo', 'org_address', 'org_contacts',
            ]);
    }

    public function test_files_are_stored_with_required_names(): void
    {
        Storage::fake('local');
        Sanctum::actingAs($this->makeTeam());

        $res = $this->post('/api/participants', $this->student([
            'needs_visa_invitation' => 1,
            'passport_number' => 'B1234567', 'passport_issue_date' => '01.02.2022',
            'passport_expiry_date' => '01.02.2032', 'passport_issued_by' => 'Immigration Office, Kampala',
            'org_address' => 'Kampala Road 1', 'org_contacts' => 'info@khs.ug',
            'passport_scan' => UploadedFile::fake()->image('scan.jpg', 1200, 800),
            'face_photo' => UploadedFile::fake()->image('face.jpg', 900, 1200),
        ]), ['Accept' => 'application/json'])->assertCreated();

        $id = $res->json('data.id');
        Storage::disk('local')->assertExists("participants/1/{$id}/Pas-Okello.jpg");
        Storage::disk('local')->assertExists("participants/1/{$id}/Face-Okello.jpg");
    }

    public function test_team_cannot_access_another_teams_participants(): void
    {
        Sanctum::actingAs($this->makeTeam('Uganda', 'a@example.ug'));
        $id = $this->postJson('/api/participants', $this->student())->json('data.id');

        Sanctum::actingAs($this->makeTeam('Kenya', 'b@example.ug'));
        $this->getJson("/api/participants/{$id}")->assertNotFound();
        $this->deleteJson("/api/participants/{$id}")->assertNotFound();
        $this->getJson('/api/participants')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_submit_requires_leader_then_locks_team(): void
    {
        Sanctum::actingAs($this->makeTeam());
        $this->postJson('/api/participants', $this->student())->assertCreated();

        $this->postJson('/api/team/submit')->assertStatus(422);

        $this->postJson('/api/participants', $this->leader())->assertCreated();
        $this->postJson('/api/team/submit')->assertOk();

        $this->postJson('/api/participants', $this->student(['family_name_en' => 'Auma']))->assertStatus(423);
        $this->getJson('/api/participants')->assertOk();   // o'qish ochiq
    }

    public function test_deadline_blocks_changes(): void
    {
        config(['iao.registration_deadline' => '2020-01-01']);
        Sanctum::actingAs($this->makeTeam());

        $this->postJson('/api/participants', $this->student())->assertStatus(423);
    }

    public function test_admin_endpoints_are_protected_and_export_works(): void
    {
        $team = $this->makeTeam();
        Sanctum::actingAs($team);
        $this->postJson('/api/participants', $this->student())->assertCreated();
        $this->getJson('/api/admin/teams')->assertForbidden();

        $admin = $this->makeTeam('Admin land', 'admin@example.ug');
        $admin->forceFill(['is_admin' => true])->save();
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/teams')->assertOk()->assertJsonFragment(['country' => 'Uganda']);

        $csv = $this->get('/api/admin/export/participants.csv')->assertOk()->streamedContent();
        $this->assertStringContainsString('family_name_en', $csv);
        $this->assertStringContainsString('Okello', $csv);
        $this->assertStringContainsString('+256700000000', $csv);   // telefon buzilmaydi

        $teamId = $team->team->id;
        $team->team->update(['submitted_at' => now()]);
        $this->postJson("/api/admin/teams/{$teamId}/reopen")->assertOk();
        $this->assertNull($team->team->fresh()->submitted_at);
    }

    public function test_register_sends_verification_email(): void
    {
        Notification::fake();

        $this->postJson('/api/auth/register', [
            'name' => 'John', 'email' => 'john@example.ug', 'password' => 'secret123',
            'password_confirmation' => 'secret123', 'country' => 'Uganda',
        ])->assertCreated();

        Notification::assertSentTo(User::where('email', 'john@example.ug')->first(), VerifyEmail::class);
    }

    public function test_unverified_user_cannot_write_until_verified_via_signed_link(): void
    {
        $user = User::create(['name' => 'New', 'email' => 'new@example.ug', 'password' => 'secret123']);
        Team::create(['user_id' => $user->id, 'country' => 'Uganda']);
        Sanctum::actingAs($user);

        $this->postJson('/api/participants', $this->student())->assertStatus(409);

        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email), 'json' => 1]);   // json=1 imzoga kiradi

        $this->getJson($url)->assertOk();
        $this->assertTrue($user->fresh()->hasVerifiedEmail());

        Sanctum::actingAs($user->fresh());
        $this->postJson('/api/participants', $this->student())->assertCreated();
    }

    public function test_verification_link_with_wrong_hash_or_signature_is_rejected(): void
    {
        $user = User::create(['name' => 'New', 'email' => 'new@example.ug', 'password' => 'secret123']);

        $bad = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60),
            ['id' => $user->id, 'hash' => 'wrong']);
        $this->getJson($bad)->assertForbidden();

        $this->getJson("/api/auth/email/verify/{$user->id}/" . sha1($user->email))->assertForbidden(); // imzosiz
        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    public function test_forgot_password_sends_link_and_hides_unknown_emails(): void
    {
        Notification::fake();
        $user = $this->makeTeam();

        $this->postJson('/api/auth/forgot-password', ['email' => $user->email])->assertOk();
        Notification::assertSentTo($user, ResetPassword::class);

        $this->postJson('/api/auth/forgot-password', ['email' => 'nobody@example.ug'])
            ->assertOk();                                   // bir xil javob
        Notification::assertCount(1);
    }

    public function test_reset_password_changes_password_and_revokes_tokens(): void
    {
        $user = $this->makeTeam();
        $user->createToken('old');
        $token = \Illuminate\Support\Facades\Password::createToken($user);

        $this->postJson('/api/auth/reset-password', [
            'token' => $token, 'email' => $user->email,
            'password' => 'newsecret123', 'password_confirmation' => 'newsecret123',
        ])->assertOk();

        $this->assertSame(0, $user->tokens()->count());
        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'newsecret123'])->assertOk();

        $this->postJson('/api/auth/reset-password', [
            'token' => 'bad-token', 'email' => $user->email,
            'password' => 'another12345', 'password_confirmation' => 'another12345',
        ])->assertStatus(422);
    }

    public function test_submit_notifies_team_and_organizers(): void
    {
        Notification::fake();
        config(['iao.organizer_emails' => ['loc@example.uz']]);

        $user = $this->makeTeam();
        Sanctum::actingAs($user);
        $this->postJson('/api/participants', $this->leader())->assertCreated();
        $this->postJson('/api/team/submit')->assertOk();

        Notification::assertSentTo($user, TeamSubmitted::class);
        Notification::assertSentOnDemand(NewTeamSubmission::class);
    }

    public function test_organizers_fall_back_to_admin_users_and_reopen_notifies_team(): void
    {
        Notification::fake();
        config(['iao.organizer_emails' => []]);

        $admin = $this->makeTeam('Admin land', 'admin@example.ug');
        $admin->forceFill(['is_admin' => true])->save();
        $this->assertSame(['admin@example.ug'], Team::organizerEmails());

        $user = $this->makeTeam();
        $user->team->update(['submitted_at' => now()]);

        Sanctum::actingAs($admin);
        $this->postJson("/api/admin/teams/{$user->team->id}/reopen")->assertOk();

        Notification::assertSentTo($user, TeamReopened::class);
    }

    // ---------------------------------------------------------------- to'lov (paid / not paid)

    public function test_team_cannot_set_payment_but_sees_it(): void
    {
        $user = $this->makeTeam();
        Sanctum::actingAs($user);

        // is_paid jamoa tomonidan yuborilsa e'tiborga olinmaydi (guarded + validatsiyada yo'q)
        $res = $this->postJson('/api/participants', $this->student(['is_paid' => true, 'payment_note' => 'hack']))->assertCreated();
        $res->assertJsonPath('data.is_paid', false)->assertJsonPath('data.paid_at', null)->assertJsonPath('data.payment_note', null);
        $id = $res->json('data.id');

        $this->patchJson("/api/participants/{$id}", ['is_paid' => true])->assertOk()->assertJsonPath('data.is_paid', false);

        // Admin endpointi jamoa uchun yopiq
        $this->patchJson("/api/admin/participants/{$id}/payment", ['is_paid' => true])->assertForbidden();
    }

    public function test_admin_marks_participant_paid_and_unpaid(): void
    {
        $user = $this->makeTeam();
        Sanctum::actingAs($user);
        $id = $this->postJson('/api/participants', $this->student())->json('data.id');

        $admin = $this->makeTeam('Admin land', 'admin@example.ug');
        $admin->forceFill(['is_admin' => true])->save();
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/participants/{$id}/payment", ['is_paid' => 'yes'])->assertStatus(422)->assertJsonValidationErrors('is_paid');

        $this->patchJson("/api/admin/participants/{$id}/payment", ['is_paid' => true, 'payment_note' => 'Receipt #17'])
            ->assertOk()
            ->assertJsonPath('participant.is_paid', true)
            ->assertJsonPath('participant.payment_note', 'Receipt #17');
        $this->assertNotNull($user->team->participants()->find($id)->paid_at);

        // Jamoa o'z sahifasida ko'radi
        Sanctum::actingAs($user);
        $this->getJson("/api/participants/{$id}")->assertOk()->assertJsonPath('data.is_paid', true);
        $this->getJson('/api/participants?paid=1')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/participants?paid=0')->assertOk()->assertJsonCount(0, 'data');

        // Bekor qilish: paid_at tozalanadi, izoh berilmasa saqlanib qoladi
        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/participants/{$id}/payment", ['is_paid' => false])
            ->assertOk()->assertJsonPath('participant.is_paid', false)->assertJsonPath('participant.paid_at', null)
            ->assertJsonPath('participant.payment_note', 'Receipt #17');

        // Jamoalar ro'yxatida va CSV'da to'lov ustunlari bor
        $this->getJson('/api/admin/teams')->assertOk()->assertJsonFragment(['country' => 'Uganda', 'paid_count' => 0]);
        $csv = $this->get('/api/admin/export/participants.csv')->assertOk()->streamedContent();
        $this->assertStringContainsString('is_paid', $csv);
        $this->assertStringContainsString('Receipt #17', $csv);
    }

    public function test_admin_marks_whole_team_paid(): void
    {
        $user = $this->makeTeam();
        Sanctum::actingAs($user);
        $a = $this->postJson('/api/participants', $this->leader())->json('data.id');
        $b = $this->postJson('/api/participants', $this->student())->json('data.id');

        $other = $this->makeTeam('Kenya', 'kenya@example.ke');
        Sanctum::actingAs($other);
        $c = $this->postJson('/api/participants', $this->student(['family_name_en' => 'Odhiambo', 'email' => 'o@example.ke']))->json('data.id');

        $admin = $this->makeTeam('Admin land', 'admin@example.ug');
        $admin->forceFill(['is_admin' => true])->save();
        Sanctum::actingAs($admin);
        $teamId = $user->team->id;

        // Boshqa jamoa ishtirokchisini bu jamoa orqali belgilab bo'lmaydi
        $this->postJson("/api/admin/teams/{$teamId}/payments", ['is_paid' => true, 'participants' => [$c]])
            ->assertStatus(422)->assertJsonValidationErrors('participants.0');

        $this->postJson("/api/admin/teams/{$teamId}/payments", ['is_paid' => true])
            ->assertOk()->assertJsonPath('updated', 2)->assertJsonPath('payments.paid', 2)->assertJsonPath('payments.unpaid', 0);
        $this->assertTrue($user->team->participants()->find($a)->is_paid);
        $this->assertTrue($user->team->participants()->find($b)->is_paid);
        $this->assertFalse($other->team->participants()->find($c)->is_paid);

        // Faqat tanlanganlarini bekor qilish
        $this->postJson("/api/admin/teams/{$teamId}/payments", ['is_paid' => false, 'participants' => [$b]])
            ->assertOk()->assertJsonPath('updated', 1)->assertJsonPath('payments.paid', 1);

        $this->getJson("/api/admin/teams/{$teamId}")->assertOk()->assertJsonPath('payments.paid', 1)->assertJsonPath('payments.total', 2);
        $this->getJson('/api/admin/teams')->assertOk()->assertJsonFragment(['country' => 'Uganda', 'paid_count' => 1]);
    }
}
