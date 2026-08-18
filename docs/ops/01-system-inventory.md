# STEP1 — System Inventory

Mənbə: birbaşa kod bazasından çıxarılıb (2026-08-17 tarixinə). Heç bir sahə
uydurulmayıb — hər sətir müvafiq faylın oxunması ilə təsdiqlənib.

## Frontend

| | |
|---|---|
| Nədir | React 19 + TypeScript SPA (Vite build) |
| Harada | `C:\Users\USER\Desktop\vibebook-frontend` |
| Build çıxışı | `dist/` (Vite static bundle — istənilən static host/CDN-ə uyğundur) |
| Router | React Router DOM v7, client-side — production-da **SPA fallback** (bütün naməlum path-lər `index.html`-ə) tələb olunur, əks halda `/products/:id` kimi deep link-lər 404 verər |
| Env dəyişəni | `VITE_API_URL` (build-time, aşağıda ətraflı) |
| Asılı olduğu | Backend REST API (`/api/*`) |
| Production-da tələb | Static file hosting + CDN/HTTPS + SPA fallback qaydası |

## Backend

| | |
|---|---|
| Nədir | Node.js + Express 5 REST API |
| Harada | `C:\Users\USER\Desktop\BookStore` |
| Giriş nöqtəsi | `src/server.js` → `src/app.js` |
| Node versiyası | `>=20.0.0` (bax `package.json` `engines`, `.nvmrc` = `24.16.0` — Phase 24C-də təsdiqlənib) |
| Start əmri | `npm start` (`node src/server.js`) |
| Port | `process.env.PORT` (default `5000`) |
| Production guard | `NODE_ENV=production` olduqda `DATABASE_URL`/`JWT_SECRET`/`CORS_ORIGIN` yoxdursa proses `exit(1)` edir (`src/server.js:10-20`) |
| Asılı olduğu | PostgreSQL (Prisma), storage backend (local və ya S3-compatible), Epoint payment provider (opsional) |
| Production-da tələb | Persistent Node process (Render/Railway/Fly.io tipli — serverless funksiya kimi deploy edilməməlidir, çünki uzun-müddətli process və `/uploads` local fayl sistemi istifadə edir) |

### Route inventarı (`src/app.js`)

| Base path | Auth | Fayl |
|---|---|---|
| `/api/admin`, `/api/admin/dashboard`, `/api/admin/orders`, `/api/admin/settings` | admin | `admin.routes.js`, `dashboard.routes.js`, `order.routes.js`, `settings.routes.js` |
| `/api/auth` | açıq (login/register) | `auth.routes.js` — `authLimiter` ilə qorunur |
| `/api/products`, `/api/categories`, `/api/covers`, `/api/templates` | admin (CRUD) | admin-only idarəetmə |
| `/api/public/products`, `/api/public/categories`, `/api/public/templates`, `/api/public/settings`, `/api/public/contact` | açıq | müştəri brauzinq |
| `/api/albums`, `/api/editor`, `/api/me`, `/api/me/addresses`, `/api/me/wishlist`, `/api/orders`, `/api/reviews`, `/api/promotions` | auth (customer) | ownership yoxlaması hər controller-də |
| `/api/payments` | auth (create/status), imzasız webhook | `payment.routes.js` — `paymentCreateLimiter` |
| `/api/upload` | auth | multer + magic-byte doğrulama |
| `/api/health` | açıq | yalnız DB bağlantısını yoxlayır (aşağıya bax) |
| `/api/docs` | açıq | Swagger UI |
| `/uploads` | açıq (static) | local storage rejimində yüklənmiş şəkillər |

**Qeyd:** `GET /api/health` yalnız `SELECT 1` ilə DB bağlantısını yoxlayır —
storage bağlantısını (local disk və ya S3) yoxlamır. Monitoring
spesifikasiyasında (`09-monitoring-alerting.md`) bu boşluq ayrıca qeyd
olunub.

## Verilənlər bazası

| | |
|---|---|
| Mühərrik | PostgreSQL |
| ORM | Prisma 6 (`@prisma/client` `^6.19.3`) |
| Env dəyişəni | `DATABASE_URL` |
| Migration tarixçəsi | Phase 21-də baseline edilib (`migrate resolve --applied` ilə 17+ fazalıq `db push` sürüşməsi bir dəfəyə sənədləşdirilib) |
| Qadağan olunan əmrlər | `prisma db push`, `prisma migrate reset`, `prisma migrate dev` — production/staging DB-yə qarşı **heç vaxt** |
| Təsdiqlənmiş əmr | `prisma migrate deploy` (yalnız bu) |

### Cədvəllər (schema.prisma-dan, 20 model)

`users`, `addresses`, `admin_users`, `categories`, `products`, `reviews`,
`wishlist_items`, `covers`, `templates`, `albums`, `album_pages`, `photos`,
`text_layers`, `orders`, `promo_codes`, `gift_cards`, `payments`,
`order_items`, `settings`, `contact_messages`, `audit_logs`.

Kritik zəncir (Phase 27 STEP11-in orphan-check-i üçün əsas):
`orders → order_items → products`, `orders → payments`,
`albums → users`, `albums → album_pages → photos`,
`album_pages → text_layers`.

## Storage (Phase 24B arxitekturası)

| | |
|---|---|
| Abstraksiya | `src/services/storage/index.js` — `save/remove/exists/getUrl` |
| Seçim mexanizmi | `STORAGE_PROVIDER` env (`local` default, `s3` opt-in) |
| Local adapter | `src/services/storage/localStorageAdapter.js` — fayl `uploads/` qovluğuna yazılır, dəyişməz davranış |
| S3 adapter | `src/services/storage/s3StorageAdapter.js` — `@aws-sdk/client-s3`, istənilən S3-compatible provider (AWS S3, MinIO, DO Spaces, Cloudflare R2) |
| Miqrasiya skripti | `scripts/migrateStorageToS3.js` — dry-run default, `--execute` ilə real yükləmə, mənbə fayl silinmir, DB yenilənmir (manifest yazır) |
| Production-da tələb | `local` rejimi ephemeral fayl sistemli platformalarda (məs. Render-in disk restart-da itən fayl sistemi) **uyğun deyil** — belə platformada `s3` rejimi məcburidir |

## Payment (Epoint, Phase 18/19 arxitekturası)

| | |
|---|---|
| Client | `src/services/epointClient.js` |
| Config | `src/config/payment.js` — bütün açarlar env-dən, heç biri hardcode deyil |
| Aktivlik şərti | `isPaymentConfigured()` — `publicKey`, `privateKey`, `apiUrl`, `successUrl`, `errorUrl` hamısı olmalıdır, əks halda endpoint-lər 503 qaytarır (heç vaxt saxta uğur simulyasiya etmir) |
| Webhook | `POST /api/payments/webhook/epoint` — imza ilə doğrulanır, auth middleware-siz (provider server-to-server) |
| Status ayrılığı | `payments.status` (PENDING/PAID/FAILED/REFUNDED) `orders.status` (Pending/Preparing/...) ilə **heç vaxt** qarışdırılmır — ayrı sütunlar, ayrı state machine |
| Real credential | Bu layihədə **heç vaxt** olmayıb — developer.epoint.az real endpoint path-lərini merchant-portal login arxasında gizlədir, ona görə `epointClient.js`-dəki `/checkout/request` və s. path-lər sənədləşdirilmiş naviqasiya strukturundan çıxarılıb, təsdiqlənmiş API kontraktı deyil |

## PDF Export

| | |
|---|---|
| Nədir | Frontend-də client-side PDF generasiyası (server-side deyil) |
| Fayl | `src/features/designer/utils/pdfExport.ts` (frontend) |
| Asılılıq | Bundled Outfit + Noto Sans şriftləri, Preflight keçidi məcburidir |
| Production-da tələb | Yoxdur — server infrastrukturuna asılı deyil, brauzerdə işləyir |

## Admin panel və Customer flow

Hər ikisi eyni frontend SPA-nın bir hissəsidir (`/admin/*` vs açıq
route-lar), ayrı deployment tələb etmir — yuxarıdakı Frontend sətrinə bax.
Token ayrımı (admin JWT vs customer JWT) `src/middleware/auth.middleware.js`
və `src/controllers/admin.controller.js`-də saxlanılır, Phase 20-də
təsdiqlənib, Phase 23/23-v2-də regressiya olmadığı yenidən yoxlanılıb.
