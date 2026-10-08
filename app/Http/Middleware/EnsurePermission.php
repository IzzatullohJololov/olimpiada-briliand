<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Admin paneli ruxsati: Route::middleware(EnsurePermission::for('payments')).
 * EnsureAdmin dan keyin ishlatiladi (foydalanuvchi administrator ekani allaqachon tekshirilgan).
 */
class EnsurePermission
{
    public static function for(string $permission): string
    {
        return self::class . ':' . $permission;
    }

    public function handle(Request $request, Closure $next, string $permission): Response
    {
        abort_unless($request->user()?->allows($permission), 403, 'Bu amal uchun ruxsatingiz yo\'q.');

        return $next($request);
    }
}
