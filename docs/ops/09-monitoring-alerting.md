# STEP9 — Monitoring & Alerting Specification

Bu, yalnız **hansı metriklərin izlənməli olduğunun spesifikasiyasıdır**.
Heç bir real monitoring provider qoşulmayıb, heç bir real uptime/error-rate
datası yoxdur — provider seçimi ayrıca, istifadəçinin təsdiqi ilə
edilməlidir (Phase 24C-nin STEP15-də artıq qeyd olunduğu kimi).

| Metric | Threshold | Severity | Action |
|---|---|---|---|
| Uptime (`GET /` və ya `/api/health`) | 2 ardıcıl uğursuz yoxlama (məs. 1 dəqiqəlik interval) | Critical | On-call bildirişi, dərhal `03-deployment-runbook.md` § 8 ilə əl ilə təsdiq |
| `/api/health` | HTTP ≠ 200 | Critical | DB bağlantısı yoxla (`database:"disconnected"` cavabı DB problemini göstərir) |
| HTTP 5xx dərəcəsi | 15 dəqiqədə >1% sorğu | High | Son deployment-i yoxla, lazımdırsa `04-rollback-runbook.md` |
| 401 spike | Normal bazadan 5x artım, 5 dəqiqədə | Medium | `08-security-incident-runbook.md` § Suspicious login attempts |
| 403 spike | Normal bazadan 5x artım, 5 dəqiqədə | Medium | CORS konfiqurasiya səhvi (yanlış `CORS_ORIGIN`) və ya IDOR cəhdi ehtimalı |
| 413 spike | 5 dəqiqədə >10 hadisə | Low | Frontend-in pre-upload validation-ı (`MAX_IMAGE_UPLOAD_BYTES`) sınmış ola bilər |
| 429 spike | 5 dəqiqədə >20 hadisə | Medium | `authLimiter`/`paymentCreateLimiter`/blanket limiter-in hansının tetiklədiyini müəyyən et, `08-security-incident-runbook.md` § Rate-limit abuse |
| Upload failures (`/api/upload` 400/500 dərəcəsi) | 15 dəqiqədə >5% | Medium | Magic-byte rejection normaldır (istifadəçi səhvi); 500 dərəcəsi artarsa storage backend problemi (`06-storage-recovery.md`) |
| Payment failures (`payments.status='FAILED'` yaranma sürəti) | Normal bazadan əhəmiyyətli artım | High | `07-payment-incident-runbook.md` |
| Webhook failures (`/api/payments/webhook/epoint` 401/500) | Hər hadisə | High | 401 → imza problemi (mümkün leak, bax STEP8); 500 → kod xətası, dərhal araşdır |
| DB connection failures | Hər ardıcıl 3 uğursuz sorğu | Critical | `05-database-backup-restore.md`, connection pool/host əlçatanlığını yoxla |
| Storage failures (`save`/`exists` xətaları) | 15 dəqiqədə >5% | High | `06-storage-recovery.md` § Bucket access failure |
| Export failures (frontend PDF export xəta dərəcəsi — client-side, backend logunda görünmür) | Frontend error-tracking mövcud olduqda qiymətləndirilməlidir | Medium | PDF export server-də deyil, brauzerdə işlədiyi üçün bu metrik yalnız frontend error-tracking (Sentry-bənzər) qoşulduqdan sonra ölçülə bilər — hazırda **infrastruktur yoxdur** |
| Response latency (p95) | Phase 25 staging baseline-dan >2x | Medium | Performans reqressiyası — `03-deployment-runbook.md`-dəki son dəyişiklikləri nəzərdən keçir |

## Qeyd: `/api/health`-in cari əhatəsi

`src/routes/health.routes.js` yalnız `SELECT 1` ilə DB-ni yoxlayır —
storage bağlantısını yoxlamır. Real monitoring quraşdırılarkən storage
üçün ayrıca sintetik yoxlama (kiçik test faylının `exists()`
çağırışı) əlavə edilməsi tövsiyə olunur, çünki hazırkı health endpoint
storage fasiləsini aşkar etməyəcək.

## Sensitiv məlumat qadağası

Heç bir monitoring/log inteqrasiyası aşağıdakıları qeyd etməməlidir:
şifrələr, JWT-lər, `PAYMENT_PRIVATE_KEY`, tam kart məlumatı, tam request
body (xüsusilə `/api/auth/*` və `/api/payments/*` üçün). Mövcud
`morgan` konfiqurasiyası (`app.js:92`) yalnız HTTP access log formatını
yazır (method/path/status/latency), body-ni loglamır — bu davranış
qorunmalıdır, hər hansı yeni monitoring inteqrasiyası bunu pozmamalıdır.

## Provider seçimi

Real monitoring provider (Sentry, Better Uptime, Datadog və s.) seçimi
bu fazanın əhatəsi xaricindədir — Phase 24C-nin öz qaydasına uyğun,
seçim istifadəçiyə təqdim olunmalı, avtomatik qoşulmamalıdır.
