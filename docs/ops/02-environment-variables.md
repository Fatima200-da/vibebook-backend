# STEP2 — Environment Variable Runbook

Bütün dəyişənlər mənbə koddan `process.env.*` / `import.meta.env.*`
axtarışı ilə çıxarılıb (`grep`, 2026-08-17). **Heç bir real secret dəyəri
bu sənəddə yoxdur** — yalnız placeholder nümunələr.

## Backend (`C:\Users\USER\Desktop\BookStore`)

| Dəyişən | İstifadə olunan yer | Required/Optional | Build/Runtime | Nümunə placeholder | Təhlükəsizlik qeydi |
|---|---|---|---|---|---|
| `PORT` | `src/server.js` | Optional (default `5000`) | Runtime | `5000` | Sensitiv deyil |
| `NODE_ENV` | `src/server.js`, `src/app.js` | Optional (default dev davranışı) | Runtime | `production` | `production` olduqda aşağıdakı 3 dəyişən məcburidir |
| `DATABASE_URL` | `prisma/schema.prisma` (`env("DATABASE_URL")`) | **Required (production)** | Runtime | `postgresql://user:password@host:5432/dbname` | Yüksək həssaslıq — DB tam giriş credential-ı, heç vaxt logda görünməməlidir |
| `JWT_SECRET` | `src/middleware/auth.middleware.js`, `src/utils/jwt.js`, `src/controllers/auth.controller.js`, `src/controllers/admin.controller.js` | **Required (production)** | Runtime | 64+ simvollu təsadüfi string | Sızarsa bütün admin/customer sessiyaları saxtalaşdırıla bilər — dərhal rotate (bax `12-credential-rotation.md`) |
| `CORS_ORIGIN` | `src/app.js` | **Required (production)** | Runtime | `https://vibebook.az,https://www.vibebook.az` | Vergüllə ayrılmış siyahı. Production-da **`*` qadağandır** — boş buraxılsa CORS check-i heç bir origin-i rədd etmir (`app.js:80`) |
| `STORAGE_PROVIDER` | `src/config/storageConfig.js` | Optional (default `local`) | Runtime | `local` və ya `s3` | Sensitiv deyil |
| `STORAGE_S3_ENDPOINT` | `src/config/storageConfig.js` | Yalnız `STORAGE_PROVIDER=s3` olduqda required | Runtime | `https://<accountid>.r2.cloudflarestorage.com` | Sensitiv deyil (endpoint URL) |
| `STORAGE_S3_REGION` | `src/config/storageConfig.js` | Optional (default `us-east-1`) | Runtime | `auto` (R2) / `us-east-1` | Sensitiv deyil |
| `STORAGE_S3_BUCKET` | `src/config/storageConfig.js` | Yalnız `STORAGE_PROVIDER=s3` olduqda required | Runtime | `vibebook-production` | Sensitiv deyil |
| `STORAGE_S3_ACCESS_KEY_ID` | `src/config/storageConfig.js` | Yalnız `STORAGE_PROVIDER=s3` olduqda required | Runtime | `AKIA...` | Yüksək həssaslıq — bucket-ə tam yazma/silmə icazəsi |
| `STORAGE_S3_SECRET_ACCESS_KEY` | `src/config/storageConfig.js` | Yalnız `STORAGE_PROVIDER=s3` olduqda required | Runtime | (gizli) | Yüksək həssaslıq |
| `STORAGE_S3_PUBLIC_URL_BASE` | `src/config/storageConfig.js` | Yalnız `STORAGE_PROVIDER=s3` olduqda required | Runtime | `https://cdn.vibebook.az` | Sensitiv deyil (public URL) |
| `STORAGE_S3_FORCE_PATH_STYLE` | `src/config/storageConfig.js` | Optional (default `false`) | Runtime | `true` (R2/MinIO üçün adətən lazımdır) | Sensitiv deyil |
| `PAYMENT_PROVIDER` | `src/config/payment.js` | Optional (default `epoint`) | Runtime | `epoint` | Sensitiv deyil |
| `PAYMENT_PUBLIC_KEY` | `src/config/payment.js` | Yalnız real payment aktivləşdirilərkən required | Runtime | (Epoint merchant portal-dan) | Orta həssaslıq |
| `PAYMENT_PRIVATE_KEY` | `src/config/payment.js` | Yalnız real payment aktivləşdirilərkən required | Runtime | (gizli) | **Ən yüksək həssaslıq** — sızarsa saxta ödəniş imzaları yaradıla bilər |
| `PAYMENT_API_URL` | `src/config/payment.js` | Yalnız real payment aktivləşdirilərkən required | Runtime | `https://api.epoint.az` (developer.epoint.az-dan təsdiqlənməlidir) | Sensitiv deyil |
| `PAYMENT_RESULT_URL` | `src/config/payment.js` | Yalnız real payment aktivləşdirilərkən required | Runtime | `https://api.vibebook.az/api/payments/webhook/epoint` | Sensitiv deyil (public webhook URL) |
| `PAYMENT_SUCCESS_URL` | `src/config/payment.js` | Yalnız real payment aktivləşdirilərkən required | Runtime | `https://vibebook.az/payment/return` | Sensitiv deyil |
| `PAYMENT_ERROR_URL` | `src/config/payment.js` | Yalnız real payment aktivləşdirilərkən required | Runtime | `https://vibebook.az/payment/return` | Sensitiv deyil |

## Frontend (`C:\Users\USER\Desktop\vibebook-frontend`)

| Dəyişən | İstifadə olunan yer | Required/Optional | Build/Runtime | Nümunə placeholder | Təhlükəsizlik qeydi |
|---|---|---|---|---|---|
| `VITE_API_URL` | `src/shared/api/client.ts`, `src/shared/utils/imageUrl.ts` | **Required (production)** | **Build-time** (Vite bütün `VITE_*` dəyişənləri bundle-a compile edir) | `https://api.vibebook.az/api` | Sensitiv deyil, amma build-time olduğu üçün **hər deployment-də düzgün dəyərlə yenidən build edilməlidir** — runtime-da dəyişdirmək mümkün deyil |

## Frontend bundle-da olmamalı sızıntı yoxlaması

Vite yalnız `VITE_`-prefiksli dəyişənləri client bundle-a daxil edir —
`JWT_SECRET`, `DATABASE_URL`, `PAYMENT_PRIVATE_KEY`, `STORAGE_S3_SECRET_ACCESS_KEY`
kimi backend-only dəyişənlər prefiks daşımadığı üçün strukturca bundle-a
düşə bilməz. Bu, Phase 20/23-də `npm run build` çıxışında (`dist/assets/*.js`)
bu string-lərin axtarışı ilə real olaraq təsdiqlənib (nəticə: tapılmadı).
Hər yeni production build-dən sonra bu yoxlama təkrarlanmalıdır — bax
`03-deployment-runbook.md` § 10.

## `.env.example` vəziyyəti

Hər iki repo-da `.env.example` mövcuddur və secret dəyər saxlamır.
Bu fazada backend `.env.example`-ə çatışmayan `STORAGE_*` placeholder
sətirləri əlavə edilib (aşağıya bax) — Phase 24B storage config-i
yaradılanda bu fayl yenilənməmişdi, indi real konfiqurasiya ilə üst-üstə
düşür.
