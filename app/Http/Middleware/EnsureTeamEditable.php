<?php

namespace App\Http\Middleware;

use App\Models\Team;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Yakuniy yuborilgan yoki muddati o'tgan jamoa ma'lumotini o'zgartirib bo'lmaydi (423 Locked). */
class EnsureTeamEditable
{
    public function handle(Request $request, Closure $next): Response
    {
        $team = $request->user()?->team;
        abort_if(!$team, 403, 'Foydalanuvchiga jamoa biriktirilmagan.');

        if ($team->isSubmitted()) {
            return response()->json(['message' => "Ro'yxat yakuniy yuborilgan, o'zgartirib bo'lmaydi. Kerak bo'lsa tashkilotchilarga murojaat qiling."], 423);
        }

        if (Team::deadlinePassed()) {
            return response()->json(['message' => "Ro'yxatdan o'tish muddati tugagan."], 423);
        }

        return $next($request);
    }
}
