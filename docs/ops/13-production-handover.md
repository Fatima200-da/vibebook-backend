# STEP13 — Production Handover Document

**Tarix**: 2026-08-18 (Phase 30-da yenilənib; ilk versiya Phase 28-də yazılıb)
**Faza**: Phase 28 (yaradılma) → Phase 29 (RC hardening) → Phase 30 (deployment-ready configuration)
**Status**: Sənədləşdirmə + deployment konfiqurasiyası tamamlanıb. **Heç bir real deployment icra edilməyib.**

## PROJECT STATUS

VibeBook — premium fotokitab e-ticarət platforması. Frontend (React 19 +
TypeScript + Vite), backend (Express 5 + Prisma 6 + PostgreSQL) tam
funksional inkişaf mühitində qurulub və dərinlikli sınanıb (Phase 1-24C:
admin panel, tam customer storefront, Designer/Canvas (crop/rotate/resize/
layers/smart guides/multi-select), PDF export, cart/checkout/promo/gift-card,
Epoint payment inteqrasiyası (kod tam, real credential yoxdur), wishlist,
reviews, notifications, search, 3-dilli i18n (AZ/EN/RU), tam təhlükəsizlik
auditı (Phase 20/23/23-v2)). **Real staging/production infrastrukturu hələ
mövcud deyil** — bax KNOWN BLOCKERS.

## ARCHITECTURE

Bax `01-system-inventory.md`. Qısaca: React SPA (static hosting) +
Express API (persistent Node process) + PostgreSQL (Prisma) + storage
abstraksiyası (local/S3-compatible, seçilə bilən) + Epoint payment (kod
hazır, credential yoxdur). Phase 24A-da təsdiqlənmiş tövsiyə: managed
platformalar (self-managed server deyil), Docker yalnız seçilən platform
tələb edərsə.

## DEPLOYMENT

Bax `03-deployment-runbook.md` — 16 addımlıq tam prosedur (backup →
env validation → DB → prisma migrate deploy → backend start → health →
storage → frontend build → frontend deploy → DNS/SSL → CORS →
customer/admin/payment smoke test).

**Phase 30-da əlavə edildi** (konkret, real deploy etmədən):
`render.yaml` (backend — bu repo-nun kökündə) və
`vibebook-frontend/render.yaml` (frontend) — Render Blueprint formatında
deklarativ deployment spesifikasiyası (build/start command, health check
path, SPA fallback rewrite qaydası). Bütün secret-shaped dəyişənlər
`sync: false` ilə işarələnib — Render bunları dashboard-da soruşur, fayla
heç nə yazılmır. `.github/workflows/backend.yml`-ə schema drift check
addımı əlavə edildi (Phase 21 texnikası, indi CI-da avtomatik) və
`node-version`/`npm install` uyğunsuzluqları düzəldildi (bax Phase 30
final hesabatı).

## DATABASE

PostgreSQL + Prisma. Phase 21-də baseline edilib (`migrate resolve
--applied` ilə sənədsiz `db push` tarixçəsi sıfırdan riskisz
formallaşdırılıb). Yeganə təsdiqlənmiş production əmr: `prisma migrate
deploy`. `db push`/`migrate reset`/`migrate dev` qəti qadağandır. Bax
`05-database-backup-restore.md`.

## STORAGE

Phase 24B-də qurulmuş abstraksiya: `local` (default, fayl serverin öz
diskində) və `s3` (istənilən S3-compatible provider). Kod tam hazırdır
və 15 real test ilə (local fs + mock S3 server) doğrulanıb. **Real
cloud credential yoxdur** — real bucket üzərində E2E BLOCKED. Bax
`06-storage-recovery.md`.

## PAYMENT

Epoint inteqrasiyası (Phase 18/19): server-authoritative məbləğ, imza
doğrulaması, idempotent webhook (atomik `updateMany`), `payments.status`
`orders.status`-dan tam ayrıdır, concurrent-payment/webhook race-ləri
qorunub, adversarial test dəsti (`paymentSecurity.test.js`) mövcuddur.
**Real Epoint merchant credential heç vaxt olmayıb** — real sandbox/production
E2E bütün fazalar boyu (Phase 22-dən bəri) ardıcıl BLOCKED statusunda.
Bax `07-payment-incident-runbook.md`.

## SECURITY

Phase 20/23/23-v2-də tam audit: env/secret sızıntısı yoxdur (bundle
scan ilə təsdiqlənib), CORS whitelist (wildcard qadağan), IDOR bağlanıb
(bütün owned-resource endpoint-lər), upload magic-byte doğrulaması,
rate limiting (auth/payment ayrıca, daha sərt), Helmet header-ləri,
admin/customer token ayrımı (Phase 20 bug-ı bağlanıb, təkrar regressiya
yoxdur). Bax `08-security-incident-runbook.md`.

## BACKUP

Prosedur Phase 21-də real icra edilib və doğrulanıb (pg_dump → disposable
DB-yə restore → row-count müqayisəsi). Real production backup **bu
fazada yaradılmayıb** (real production DB yoxdur). Bax
`05-database-backup-restore.md`.

## MONITORING

Yalnız spesifikasiya mövcuddur — heç bir real provider qoşulmayıb, heç
bir real metrik yoxdur. Bax `09-monitoring-alerting.md`.

## ROLLBACK

Frontend/backend/DB/storage üçün ayrı prosedurlar sənədləşdirilib.
Əsas məhdudiyyət: Prisma-nın avtomatik down-migration-u yoxdur, DB
rollback yalnız backup restore ilə mümkündür. Bax
`04-rollback-runbook.md`.

## INCIDENT RESPONSE

Payment (`07-payment-incident-runbook.md`) və security
(`08-security-incident-runbook.md`) insidentləri üçün ayrı runbook-lar
mövcuddur, hər biri real kod davranışına (fayl/sətir səviyyəsində)
istinad edir.

## SMOKE TESTS

Checklist hazırdır (`10-smoke-test-checklist.md`), PASS/FAIL sahələri
**boşdur** — Phase 25 real staging-də doldurulacaq.

## KNOWN BLOCKERS

| Blocker | Səbəb | Hansı fazada həll olunmalıdır |
|---|---|---|
| Real hosting provider seçimi/hesabı | İstifadəçi təsdiqi və hesab yaradılması lazımdır (Claude hesab yarada bilmir) | Phase 25 (staging) |
| Real staging PostgreSQL | Yuxarıdakına bağlı | Phase 25 |
| Real S3-compatible credential (R2/Spaces/S3) | Yuxarıdakına bağlı | Phase 25 |
| Real domen/DNS/SSL | İstifadəçi domen almalı/idarə etməlidir | Phase 25/26 (staging `*.onrender.com`-kimi subdomen ilə keçilə bilər) |
| Real Epoint merchant credential | developer.epoint.az real endpoint-ləri merchant-portal login arxasında gizlədir, heç vaxt əldə edilməyib | Payment E2E daim BLOCKED qalır bu təmin olunana qədər |
| Real monitoring provider | İstifadəçi seçimi tələb olunur (avtomatik qoşulmur) | Phase 25/26 |

**Phase 25 (staging deployment), Phase 26 (production cutover), Phase 27
(post-launch audit) — heç biri hələ başlamayıb.** Bu sənədlər yalnız
bunların icrası üçün hazırlıqdır.

## NEXT ACTIONS

1. İstifadəçi hosting provider (Render tövsiyə edilib — bax əvvəlki
   Phase 25 mesajı) və Cloudflare R2 hesabları yaradır.
2. Real staging `DATABASE_URL` və R2 credential-ları təqdim edilir.
3. Phase 25 bu runbook-lardan (`03-deployment-runbook.md` başda olmaqla)
   istifadə edərək real staging-də icra olunur.
4. Phase 25 tam PASS olduqdan sonra, YALNIZ o zaman, Phase 26 başlaya bilər.
