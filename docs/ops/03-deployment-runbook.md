# STEP3 — Deployment Runbook

Phase 24A/24B-də təsdiqlənmiş arxitekturaya (managed backend + managed
Postgres + static frontend hosting + S3-compatible storage) uyğun,
addım-addım prosedur. **Bu sənəd heç bir real deploy icra etmir** — Phase
25 real staging infrastrukturu qurulduqda bu addımlar orada icra
olunacaq.

Hər addımda uğursuzluq halında dərhal dayan və `04-rollback-runbook.md`-a
keç — sonrakı addıma "bəlkə düzələr" gözləntisi ilə keçmə.

**Phase 30 yeniləməsi:** bu addımların konkret Render Blueprint reallaşması
`render.yaml` (backend, bu repo-nun kökündə) və `vibebook-frontend/render.yaml`
(frontend) fayllarındadır — build/start command-ları, health check path-i
və SPA fallback qaydası artıq deklarativ şəkildə sənədləşib. Bu fayllar heç
nə yaratmır; yalnız Render-ə blueprint tətbiq ediləndə (real hesabla, əl ilə)
istifadə olunur.

## 1. Backup

Deployment-dən (xüsusilə hər migration-dan) **əvvəl** production DB-nin
tam `pg_dump` backup-ı götürülməlidir. Prosedur: `05-database-backup-restore.md`.
Backup faylının yaradıldığı və oxuna bildiyi (`pg_restore --list`)
təsdiqlənmədən sonrakı addıma keçmə.

## 2. Environment validation

`02-environment-variables.md`-dəki bütün **Required** dəyişənlərin real
dəyərlərlə (placeholder deyil) mövcud olduğunu təsdiq et:

```
DATABASE_URL, JWT_SECRET, CORS_ORIGIN         (backend, həmişə)
STORAGE_PROVIDER=s3 seçilibsə → bütün STORAGE_S3_*
PAYMENT_* aktivləşdirilibsə → bütün PAYMENT_*
VITE_API_URL                                   (frontend, build-time)
```

`NODE_ENV=production` ilə `node src/server.js` başladanda əskik
`DATABASE_URL`/`JWT_SECRET`/`CORS_ORIGIN` avtomatik `exit(1)` ilə
dayanır (`src/server.js:10-20`) — bu addım əslində öz-özünü təsdiqləyir,
amma `STORAGE_*`/`PAYMENT_*` üçün bu guard yoxdur, əl ilə yoxlanmalıdır.

## 3. Database connectivity

```bash
node -e "require('./src/config/prisma').\$queryRaw\`SELECT 1\`.then(()=>{console.log('DB reachable');process.exit(0)}).catch(e=>{console.error(e);process.exit(1)})"
```

## 4. `prisma generate`

```bash
npx prisma generate
```

Client kodu `schema.prisma`-dan yenidən yaradılır — hər deployment-də
məcburidir (paketin daxilində saxlanmır).

## 5. `prisma migrate status`

```bash
npx prisma migrate status
```

Gözlənilən çıxış: "Database schema is up to date". Əgər tətbiq
olunmamış migration-lar görünürsə, addım 6-a keçmədən əvvəl onların
**yalnız** artıq təsdiqlənmiş, real Phase 21 baseline-dan sonrakı
migration-lar olduğunu təsdiq et.

## 6. `prisma migrate deploy`

```bash
npx prisma migrate deploy
```

**QƏTİ QADAĞAN:** `prisma db push`, `prisma migrate reset`,
`prisma migrate dev` — bunların heç biri production/staging DB-yə qarşı
işlədilməməlidir (Phase 21-in baseline strategiyasını pozar).

## 7. Backend start

```bash
npm start
```

(`package.json` → `"start": "node src/server.js"`). Process manager
(platform-un öz restart/health-check mexanizmi) ilə işə salınmalıdır ki,
crash zamanı avtomatik yenidən başlasın.

## 8. Health check

```bash
curl -s https://<backend-domain>/api/health
```

Gözlənilən: `{"status":"ok","database":"connected"}`, HTTP 200. `503`
qayıdarsa DB bağlantı problemi var — addım 3-ə qayıt.

## 9. Storage validation

`STORAGE_PROVIDER=s3` seçilibsə: kiçik test JPEG-i `/api/upload`
endpoint-inə göndər, cavabdakı `path`-in `STORAGE_S3_PUBLIC_URL_BASE`
ilə başlayan mütləq URL olduğunu təsdiq et, sonra həmin URL-ə birbaşa
`GET` göndərib şəklin əslində əlçatan olduğunu yoxla.

`STORAGE_PROVIDER=local` (default) seçilibsə: eyni test, cavabın
`uploads/<key>` formatında olduğunu və `/uploads/<key>`-in backend
domenindən əlçatan olduğunu təsdiq et.

## 10. Frontend build

```bash
VITE_API_URL=https://<real-backend-domain>/api npm run build
```

Build-dən sonra bundle-da secret sızıntısı yoxlaması:

```bash
grep -rE "JWT_SECRET|PAYMENT_PRIVATE_KEY|DATABASE_URL|STORAGE_S3_SECRET" dist/assets/*.js
```

Nəticə boş olmalıdır (bax `02-environment-variables.md` § bundle
yoxlaması).

## 11. Frontend deployment

`dist/` qovluğunu static hosting platformasına yüklə. SPA fallback
qaydasının aktiv olduğunu təsdiq et — platform-a görə fərqli konfiqurasiya
tələb edir (məs. Render Static Site-da "Rewrite: `/*` → `/index.html`").

## 12. DNS/SSL validation

Yalnız real domen mövcud olduqda tətbiq olunur. `HTTP → HTTPS` redirect,
`www`/root konsistensiyası, sertifikatın etibarlı olduğunu yoxla.

## 13. CORS validation

```bash
curl -sI -H "Origin: https://<real-frontend-domain>" https://<backend-domain>/api/health | grep -i access-control
curl -sI -H "Origin: https://evil-random-origin.test" https://<backend-domain>/api/health
```

Birincidə `Access-Control-Allow-Origin` başlığı görünməli, ikincidə
CORS xətası (403) qayıtmalıdır.

## 14. Customer smoke test

Bax `10-smoke-test-checklist.md` § Customer.

## 15. Admin smoke test

Bax `10-smoke-test-checklist.md` § Admin.

## 16. Payment smoke test

**Yalnız** real `PAYMENT_*` credential-ları mövcud olduqda. Yoxdursa bu
addım açıq şəkildə `BLOCKED` kimi qeyd olunur, heç vaxt keçilmiş kimi
göstərilmir. Bax `10-smoke-test-checklist.md` § Payment və
`07-payment-incident-runbook.md`.
