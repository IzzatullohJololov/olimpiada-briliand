<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ParticipantController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsurePermission;
use App\Http\Middleware\EnsureTeamEditable;
use App\Models\Participant;
use App\Support\Olympiad;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');

    // Parolni tiklash
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');

    // Email tasdiqlash havolasi (imzolangan; nomi 'verification.verify' bo'lishi shart — Laravel xati shuni ishlatadi)
    Route::get('email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
        ->middleware(['signed', 'throttle:6,1'])->name('verification.verify');
});

// Forma uchun tanlov variantlari (ochiq)
Route::get('meta/options', fn () => [
    'statuses' => Participant::STATUSES,
    'student_groups' => Participant::GROUPS,
    'diets' => Participant::DIETS,
    'official_languages' => Participant::LANGUAGES,
    'tshirt_sizes' => Participant::TSHIRTS,
    'sex' => ['male', 'female'],
    'registration_deadline' => Olympiad::settings()['registration_closes_on'],
]);

// Olimpiada ma'lumotlari va ro'yxatga olish oynasi (ochiq) — sayt shu yerdan oladi
Route::get('meta/settings', fn () => Olympiad::forPublic());

Route::middleware('auth:sanctum')->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/email/resend', [AuthController::class, 'resendVerification'])->middleware('throttle:3,1');

    // O'qish — doim mumkin
    Route::get('team', [TeamController::class, 'show']);
    Route::get('participants', [ParticipantController::class, 'index']);
    Route::get('participants/{participant}', [ParticipantController::class, 'show'])->whereNumber('participant');
    Route::get('participants/{participant}/files/{type}', [ParticipantController::class, 'file'])
        ->whereNumber('participant')->where('type', 'passport|face');

    // Yozish — email tasdiqlanmagan bo'lsa 409, yuborilgan yoki muddati o'tgan bo'lsa 423
    Route::middleware(['verified', EnsureTeamEditable::class])->group(function () {
        Route::patch('team', [TeamController::class, 'update']);
        Route::post('team/submit', [TeamController::class, 'submit']);
        Route::post('participants', [ParticipantController::class, 'store']);
        Route::match(['put', 'patch'], 'participants/{participant}', [ParticipantController::class, 'update'])->whereNumber('participant');
        Route::delete('participants/{participant}', [ParticipantController::class, 'destroy'])->whereNumber('participant');
    });

    // Administrator. Har bir administrator ko'ra oladi; o'zgartirish amallari ruxsat bo'yicha (User::PERMISSIONS).
    Route::prefix('admin')->middleware(EnsureAdmin::class)->group(function () {
        // Ko'rish — barcha administratorlar
        Route::get('teams', [AdminController::class, 'teams']);
        Route::get('teams/{team}', [AdminController::class, 'showTeam']);
        Route::get('settings', [AdminController::class, 'settings']);
        Route::get('participants/{participant}/files/{type}', [AdminController::class, 'file'])->where('type', 'passport|face');
        Route::get('export/participants.csv', [AdminController::class, 'exportCsv']);
        Route::get('permissions', [AdminUserController::class, 'permissions']);

        // Jamoalarni boshqarish
        Route::middleware(EnsurePermission::for('teams.manage'))->group(function () {
            Route::patch('teams/{team}', [AdminController::class, 'updateTeam']);
            Route::delete('teams/{team}', [AdminController::class, 'destroyTeam']);
            Route::post('teams/{team}/approve', [AdminController::class, 'approve']);
            Route::post('teams/{team}/reject', [AdminController::class, 'reject']);
            Route::post('teams/{team}/reset-password', [AdminController::class, 'resetPassword']);
            Route::post('teams/{team}/reopen', [AdminController::class, 'reopen']);
            Route::post('teams/{team}/archive', [AdminController::class, 'archive']);
            Route::post('teams/{team}/unarchive', [AdminController::class, 'unarchive']);
        });

        // To'lov: ishtirokchi to'lov qildi / qilmadi, summa (bitta yoki jamoa bo'yicha bir yo'la)
        Route::middleware(EnsurePermission::for('payments'))->group(function () {
            Route::patch('participants/{participant}/payment', [AdminController::class, 'updatePayment'])->whereNumber('participant');
            Route::post('teams/{team}/payments', [AdminController::class, 'updateTeamPayments']);
        });

        // Sozlamalar va yangi mavsum
        Route::middleware(EnsurePermission::for('settings'))->group(function () {
            Route::put('settings', [AdminController::class, 'updateSettings']);
            Route::post('teams/archive-all', [AdminController::class, 'archiveAll']);
        });

        // Admin paneli foydalanuvchilari
        Route::middleware(EnsurePermission::for('users'))->group(function () {
            Route::get('users', [AdminUserController::class, 'index']);
            Route::post('users', [AdminUserController::class, 'store']);
            Route::patch('users/{user}', [AdminUserController::class, 'update'])->whereNumber('user');
            Route::post('users/{user}/reset-password', [AdminUserController::class, 'resetPassword'])->whereNumber('user');
            Route::delete('users/{user}', [AdminUserController::class, 'destroy'])->whereNumber('user');
        });
    });
});
