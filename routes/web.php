<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Sayt (public/index.html) — bitta sahifali ilova. Prod'da nginx/Apache uni to'g'ridan-to'g'ri beradi;
// `php artisan serve` da esa Laravel beradi, shunda http://127.0.0.1:8000 da sayt ham, API ham birga ishlaydi.
$spa = fn () => response()->file(public_path('index.html'), ['Cache-Control' => 'no-cache']);

Route::get('/', $spa);

Route::get('/email-verified', fn () => response(<<<'HTML'
<!doctype html><html lang="uz"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>IAO 2026</title>
<style>body{font-family:system-ui,sans-serif;max-width:480px;margin:15vh auto;padding:0 20px;text-align:center}
h1{color:#0a7d4f}</style></head><body>
<h1>Email tasdiqlandi ✔</h1>
<p>Rahmat! Endi tizimga kirib, ishtirokchilarni qo'shishingiz mumkin.</p>
</body></html>
HTML));

Route::get('/reset-password', fn () => response(<<<'HTML'
<!doctype html><html lang="uz"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Parolni tiklash — IAO 2026</title>
<style>body{font-family:system-ui,sans-serif;max-width:420px;margin:10vh auto;padding:0 20px}
input,button{width:100%;padding:10px;margin:6px 0;font-size:16px;box-sizing:border-box}
button{background:#0a7d4f;color:#fff;border:0;border-radius:6px;cursor:pointer}#msg{margin-top:12px}</style></head><body>
<h2>Yangi parol o'rnatish</h2>
<input id="p1" type="password" placeholder="Yangi parol (kamida 8 belgi)">
<input id="p2" type="password" placeholder="Parolni takrorlang">
<button id="go">Saqlash</button><div id="msg"></div>
<script>
const q=new URLSearchParams(location.search);
document.getElementById('go').onclick=async()=>{
  const m=document.getElementById('msg');m.textContent='...';
  const r=await fetch('/api/auth/reset-password',{method:'POST',
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({token:q.get('token'),email:q.get('email'),
      password:document.getElementById('p1').value,
      password_confirmation:document.getElementById('p2').value})});
  const d=await r.json();
  m.textContent=r.ok?d.message:(d.errors?Object.values(d.errors).flat().join(' '):d.message);
};
</script></body></html>
HTML));

// Qolgan barcha manzillar (/login, /participants/5, /<admin-secret> ...) — SPA'ning o'z router'i ochadi.
// /api/* uchun esa oddiy 404 (JSON) qaytadi.
Route::fallback(function (Request $request) use ($spa) {
    abort_if($request->is('api/*'), 404);

    return $spa();
});
