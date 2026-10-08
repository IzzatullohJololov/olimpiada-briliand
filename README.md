# IAO 2026 — ro'yxatdan o'tish API (Laravel 11/12 + Sanctum)

Anketa (ia26pers_*.xls) asosida: har bir davlat jamoasi o'z akkauntini ochadi va
jamoa rahbarlari / kuzatuvchilar / talabalar ma'lumotlarini kiritadi.

## O'rnatish

```bash
composer create-project laravel/laravel iao-api
cd iao-api
php artisan install:api          # Sanctum + routes/api.php
```

Shu arxivdagi fayllarni loyiha ichiga o'sha yo'llar bilan nusxalang
(`app/`, `config/iao.php`, `database/migrations/`, `routes/api.php`, `public/api-docs/`, `tests/` — mavjud fayllarni almashtiring).
Keyin `.env` da bazani sozlang va:

```bash
php artisan migrate
php artisan serve
```

Fayllar `storage/app/private` ichida saqlanadi (ochiq emas), yuklab olish faqat API orqali.

## API hujjati (OpenAPI / Swagger)

- `public/api-docs/openapi.yaml` — to'liq OpenAPI 3.0 spetsifikatsiya (barcha endpoint, maydon, xato javoblari). Frontend dasturchiga shuni bering;
  Postman/Insomnia'ga import qilish yoki `openapi-generator` bilan TypeScript klient yaratish mumkin.
- `http://localhost:8000/api-docs/index.html` — brauzerda interaktiv Swagger sahifa. **Authorize** tugmasiga tokenni kiritib,
  endpointlarni to'g'ridan-to'g'ri sinab ko'rish mumkin.

## Endpointlar (prefiks: /api)

| Metod | URL | Tavsif |
|---|---|---|
| POST | /auth/register | name, email, password, password_confirmation, country → token |
| POST | /auth/login | email, password → token |
| POST | /auth/forgot-password | email → parolni tiklash havolasi yuboriladi (email bor-yo'qligi oshkor qilinmaydi) |
| POST | /auth/reset-password | token, email, password, password_confirmation → parol yangilanadi, eski tokenlar bekor |
| GET | /auth/email/verify/{id}/{hash} | emaildagi imzolangan havola (token kerak emas) |
| POST | /auth/email/resend | (token kerak) tasdiqlash xatini qayta yuborish, 3/daqiqa |
| POST | /auth/logout | (token kerak) |
| GET | /auth/me | joriy foydalanuvchi + jamoa |
| GET | /meta/options | statuslar, guruhlar, dieta, futbolka o'lchamlari |
| GET / PATCH | /team | jamoa, ishtirokchilar soni, `locked` holati / davlat nomini o'zgartirish |
| POST | /team/submit | ro'yxatni **yakuniy yuborish** (tekshiradi va jamoani qulflaydi) |
| GET | /participants?status=student | ro'yxat |
| POST | /participants | yangi ishtirokchi (multipart/form-data) |
| GET / PATCH / DELETE | /participants/{id} | ko'rish / yangilash / o'chirish |
| GET | /participants/{id}/files/passport \| face | yuklangan faylni olish |

Header: `Authorization: Bearer <token>`, `Accept: application/json`.

**Fayl bilan yangilash:** PHP `multipart/form-data` ni `PATCH`/`PUT` da o'qimaydi, shuning uchun `POST /participants/{id}`
yuborib, `_method=PATCH` maydonini qo'shing (hozirgi marshrutlar shuni qo'llaydi). Faylsiz yangilash uchun oddiy JSON `PATCH` ishlaydi.

## Email tasdiqlash va parolni tiklash

- Ro'yxatdan o'tgach emailga tasdiqlash havolasi ketadi. **Tasdiqlanmaguncha** ishtirokchi qo'shish/o'zgartirish/o'chirish va yakuniy yuborish **409** qaytaradi; ko'rish va login ishlaydi.
- Havola API'ning o'ziga olib keladi, tasdiqlagach `IAO_FRONTEND_URL/email-verified` ga yo'naltiradi (`?json=1` qo'shilsa JSON qaytaradi).
- Parolni tiklash xatidagi havola `IAO_FRONTEND_URL/reset-password?token=...&email=...` ko'rinishida; frontend shu `token` va `email` bilan `POST /auth/reset-password` ni chaqiradi.
- `app/Providers/AppServiceProvider.php` ni almashtirish kerak (reset havolasi shu yerda sozlanadi).

`.env` (pochta va frontend):

```env
APP_URL=https://api.iao2026.example.uz      # imzolangan havolalar shu manzil bilan tuziladi
IAO_FRONTEND_URL=https://iao2026.example.uz
MAIL_MAILER=smtp
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_ADDRESS=iao2026@example.uz
MAIL_FROM_NAME="IAO 2026"
```

Sinov uchun `MAIL_MAILER=log` qo'ysangiz xatlar `storage/logs/laravel.log` ga yoziladi.
Server proksi (nginx/Cloudflare) orqasida bo'lsa, `https` havolalar to'g'ri tuzilishi uchun
Laravel'da trusted proxies sozlangan bo'lishi kerak, aks holda imzo tekshiruvi 403 beradi.

## Email xabarnomalar

| Voqea | Kimga | Mazmuni |
|---|---|---|
| Ro'yxat yakuniy yuborildi | jamoa mas'uli | tasdiq: vaqt va ishtirokchilar ro'yxati |
| Ro'yxat yakuniy yuborildi | tashkilotchilar | jamoa, mas'ul shaxs, soni (rahbar/kuzatuvchi/talaba), viza so'raganlar soni |
| Administrator `reopen` qildi | jamoa mas'uli | ro'yxat tahrirlash uchun qayta ochildi |

Tashkilotchilar `.env` dagi `IAO_ORGANIZER_EMAILS=loc@example.uz,gavrilov@issp.ac.ru` ga yuboriladi;
bo'sh bo'lsa — barcha administratorlarga. Xat yuborilmay qolsa ham yuborish/qayta ochish bekor bo'lmaydi
(xato `storage/logs` ga yoziladi). Xatlar hozir darhol yuboriladi (navbatsiz); katta yuk bo'lsa
bildirishnomalarga `ShouldQueue` qo'shib, `php artisan queue:work` ishga tushiring.

## Administrator endpointlari (is_admin=true kerak)

| Metod | URL | Tavsif |
|---|---|---|
| GET | /admin/teams | barcha jamoalar: davlat, rahbarlar/kuzatuvchilar/talabalar soni, yuborilgan vaqti |
| GET | /admin/teams/{id} | jamoa va uning barcha ishtirokchilari |
| POST | /admin/teams/{id}/reopen | yuborilgan jamoani qayta ochish (xato tuzatish uchun) |
| GET | /admin/participants/{id}/files/passport \| face | istalgan ishtirokchi faylini yuklab olish |
| GET | /admin/export/participants.csv | hamma ishtirokchilar CSV (Excel'da UTF-8 to'g'ri ochiladi) |

Administrator tayinlash (avval o'sha odam /auth/register qilgan bo'lishi kerak):

```bash
php artisan iao:make-admin admin@example.com
```

## Muddat va yakuniy yuborish

- `.env` ga `IAO_REGISTRATION_DEADLINE=2026-11-15` qo'shilsa, shu kun oxiridan keyin yozish amallari (qo'shish, o'zgartirish, o'chirish, yuborish) **423 Locked** qaytaradi. O'qish ochiq qoladi. Bo'sh bo'lsa — cheklov yo'q. Vaqt zonasi: `config/app.php` da `'timezone' => 'Asia/Tashkent'`.
- `POST /team/submit` quyidagilarni tekshiradi: kamida bitta jamoa rahbari bor; viza so'ragan har bir ishtirokchida pasport ma'lumotlari, ikkala fayl, tashkilot manzili va aloqasi to'liq. Xato bo'lsa 422 va nima yetishmasligi ro'yxati qaytadi. Muvaffaqiyatli bo'lsa jamoa qulflanadi.
- Qulflangan jamoani faqat administrator `reopen` qila oladi.

## Testlar

```bash
php artisan test --filter=IaoApiTest
```

Test faylini `tests/Feature/IaoApiTest.php` ga qo'ying (SQLite xotirada ishlaydi, `pdo_sqlite` kerak).
Qamrab olingan: ro'yxatdan o'tish, email tasdiqlash (imzo, noto'g'ri hash), parolni tiklash, email xabarnomalar, lotin/BOSH HARF qoidasi, viza bo'yicha majburiy maydonlar,
fayl nomlari, jamoalar izolyatsiyasi, yakuniy yuborish va qulf, muddat, admin huquqi, CSV eksport.

## Maydonlar (anketadagi band → API maydoni)

status: team_leader | team_leader_jury | observer | student
student_group (student uchun majburiy): alpha | beta | gamma · previous_prizewinner · needs_visa_invitation

1.1 family_name_en · 1.2 first_name_en · 2.1 family_name_native · 2.2 first_name_native ·
3 birth_date (DD.MM.YYYY) · 4 birth_place · 5 sex (male|female) ·
6.1 citizenship · 6.2 other_citizenships · 6.3 ethnicity · 6.4 previous_visits_uz ·
8.1 passport_number · 8.2 passport_issue_date · 8.3 passport_expiry_date · 8.4 passport_issued_by ·
8.6 passport_scan (*.jpg fayl) · 8.7 face_photo (*.jpg, kamida 900x1200) ·
9 position · 10.1 org_name · 10.2 org_location · 10.3 org_address · 10.4 org_contacts ·
10.5 graduation_date · 10.6 previous_olympiads ·
11.1 home_location · 11.2 home_address · 11.3 home_phone · 11.4 mobile_phone · 11.5 email ·
12.1 official_language (russian|english|both) · 12.2 native_languages ·
13.1 diet (standard|vegetarian|avoid_pork) · 13.2 food_notes · 13.3 medical_notes · 13.4 tshirt_size ·
14.1 emergency_family_name · 14.2 emergency_first_name · 14.3 emergency_relation · 14.4 emergency_age ·
14.5 emergency_languages · 14.6 emergency_phones · 14.7 emergency_email · 14.8 emergency_telegram

## Anketa qoidalari validatsiyada

- Inglizcha ism/familiya: faqat 26 ta lotin harfi, FAQAT BOSH HARFLARDA yozish rad etiladi.
- Pasport (8.1–8.4, 8.6, 8.7) va tashkilot manzili (10.3–10.4): faqat `needs_visa_invitation=1` bo'lsa majburiy, aks holda keyinroq yuborish mumkin.
- Fayllar faqat *.jpg (5 MB gacha); saqlanganda `Pas-Familiya.jpg` / `Face-Familiya.jpg` deb nomlanadi.
- Dieta yuborilmasa `standard` bo'ladi.
- Jamoa faqat o'z ishtirokchilarini ko'radi va o'zgartiradi.

## Misollar

```bash
curl -X POST http://localhost:8000/api/auth/register -H "Accept: application/json" \
  -d name="John Okello" -d email=john@example.ug -d password=secret123 \
  -d password_confirmation=secret123 -d country=Uganda

curl -X POST http://localhost:8000/api/participants \
  -H "Accept: application/json" -H "Authorization: Bearer TOKEN" \
  -F status=student -F student_group=alpha \
  -F family_name_en=Okello -F first_name_en="Peter James" \
  -F family_name_native=Okello -F first_name_native="Peter James" \
  -F birth_date=12.05.2009 -F birth_place="Kampala, Uganda" -F sex=male \
  -F citizenship=Ugandan -F position=Student \
  -F org_name="Kampala High School" -F org_location="Kampala, Uganda" \
  -F home_location="Kampala, Uganda" -F home_address="Plot 5, Kampala" \
  -F mobile_phone="+256700000000" -F email=peter@example.ug \
  -F official_language=english -F native_languages=Luganda \
  -F emergency_family_name=Okello -F emergency_first_name=Mary \
  -F emergency_relation=mother -F emergency_phones="+256711111111" \
  -F needs_visa_invitation=1 -F passport_number=B1234567 \
  -F passport_issue_date=01.02.2022 -F passport_expiry_date=01.02.2032 \
  -F passport_issued_by="Immigration Office, Kampala" \
  -F org_address="Kampala Road 1, Kampala" -F org_contacts="info@khs.ug" \
  -F passport_scan=@Pas-Okello.jpg -F face_photo=@Face-Okello.jpg
```

## Keyingi qadamlar (xohlasangiz)

XLSX eksport (PhpSpreadsheet), ro'yxatga olish statistikasi paneli, frontend (Vue/React) namunasi.
# olimpiada-briliand
