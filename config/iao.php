<?php

return [
    // Oxirgi sana (shu kunning oxirigacha o'zgartirish mumkin). Bo'sh bo'lsa — cheklov yo'q.
    // .env: IAO_REGISTRATION_DEADLINE=2026-11-15
    'registration_deadline' => env('IAO_REGISTRATION_DEADLINE'),

    // Yangi ariza haqida xabar oluvchi tashkilotchi emaillari (vergul bilan). Bo'sh bo'lsa — barcha administratorlarga.
    // .env: IAO_ORGANIZER_EMAILS=loc@example.uz,gavrilov@issp.ac.ru
    'organizer_emails' => array_values(array_filter(array_map('trim', explode(',', (string) env('IAO_ORGANIZER_EMAILS', ''))))),

    // Frontend manzili: emaildagi havolalar (parolni tiklash, tasdiqlangandan keyingi sahifa) shunga yo'naltiriladi.
    // .env: IAO_FRONTEND_URL=https://iao2026.example.uz
    'frontend_url' => rtrim(env('IAO_FRONTEND_URL', env('APP_URL', 'http://localhost')), '/'),
];
