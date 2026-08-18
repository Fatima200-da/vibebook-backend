# STEP11 — Disaster Recovery Checklist

## RTO/RPO — TARGET (real infrastruktura əsaslanmır, yalnız ilkin hədəf)

| | Target |
|---|---|
| **RPO** (Recovery Point Objective) | ≤ 24 saat (gündəlik backup tezliyinə əsaslanır — bax `05-database-backup-restore.md`) |
| **RTO** (Recovery Time Objective) — Database | ≤ 2 saat (backup tapılması + `pg_restore` + doğrulama) |
| **RTO** — Backend | ≤ 15 dəqiqə (əvvəlki release-ə platform-səviyyəli rollback) |
| **RTO** — Frontend | ≤ 5 dəqiqə (static host-un əvvəlki build-ə atomic keçidi) |
| **RTO** — Storage (S3-compatible) | Provider-in öz SLA-sına bağlı — bu fazada bilinmir |

Bu ədədlər real hosting/DB/storage provider seçildikdən və real backup
tezliyi/restore vaxtı ölçüldükdən sonra yenidən qiymətləndirilməli və
"target"dan "measured"a keçirilməlidir.

## Ssenarilər

### DB unavailable
**Əlamət**: `/api/health` → `503 database:"disconnected"`.
**Cavab**: connection string/host əlçatanlığını yoxla, provider-in öz
status səhifəsini yoxla (real provider seçildikdən sonra). Backend
özözünə "graceful degradation" etmir — DB olmadan demək olar heç bir
endpoint işləmir (statik `/uploads` xaric).

### DB corruption
**Cavab**: `04-rollback-runbook.md` § Corrupted production data,
`11-disaster-recovery.md` § Production Data Integrity sorğuları ilə
əhatəni müəyyən et, sonra `05-database-backup-restore.md` ilə restore.

### Storage unavailable
**Əlamət**: upload-lar 500 qaytarır, mövcud şəkillər yüklənmir.
**Cavab**: `06-storage-recovery.md` § Bucket access failure.
**Qeyd**: `/api/health` hazırda storage-u yoxlamır (bax
`09-monitoring-alerting.md`) — bu ssenari yalnız funksional
şikayət/monitoring vasitəsilə aşkarlana bilər, health check ilə yox.

### Backend unavailable
**Əlamət**: bütün `/api/*` sorğuları timeout/connection refused.
**Cavab**: platform-un process/crash log-larını yoxla, `04-rollback-runbook.md`
§ Failed backend deployment.

### Frontend unavailable
**Əlamət**: static host 5xx/timeout.
**Cavab**: static host provider statusunu yoxla, `04-rollback-runbook.md`
§ Failed frontend deployment.

### Payment provider unavailable
**Cavab**: `07-payment-incident-runbook.md` § provider timeout —
`createPayment` `502 PROVIDER_UNREACHABLE` qaytarır, payment sətri
avtomatik `FAILED`-ə keçir, order toxunulmaz qalır. Heç bir DB
müdaxiləsi tələb olunmur, yalnız provider bərpa olunana qədər müştəri
bildirişi (frontend-də artıq mövcud error state).

### Webhook outage
**Cavab**: `07-payment-incident-runbook.md` § webhook unavailable —
`PENDING` ödənişlər yığılır, fasilə bitdikdən sonra provider-in öz
retry mexanizmi (əgər dəstəklənirsə) və ya əl ilə status-yoxlama
prosedurunu tətbiq et.
