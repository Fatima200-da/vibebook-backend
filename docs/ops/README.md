# VibeBook — Operational Handover Documentation (Phase 28)

Bu qovluq Phase 28 — "Operational Documentation, Runbooks & Production Handover
Preparation" fazasının nəticəsidir.

**Bu sənədlər deployment DEYİL.** Heç bir real hosting, production DB, DNS,
SSL, Epoint və ya R2/S3 kimi xarici infrastruktura toxunulmayıb. Bütün
məzmun mövcud kod bazasından (backend: `C:\Users\USER\Desktop\BookStore`,
frontend: `C:\Users\USER\Desktop\vibebook-frontend`) və əvvəlki fazalarda
(Phase 18–24C) artıq təsdiqlənmiş arxitekturadan çıxarılıb.

Real staging/production nəticəsi (uptime, error rate, real transaction,
real monitoring datası) bu sənədlərdə **yoxdur** və olmamalıdır — bunlar
yalnız Phase 25/26/27 real infrastruktur üzərində icra olunduqdan sonra
doldurulacaq.

## İçindəkilər

| # | Sənəd | Məzmun |
|---|---|---|
| 1 | [01-system-inventory.md](01-system-inventory.md) | Frontend/backend/DB/storage/payment komponent siyahısı |
| 2 | [02-environment-variables.md](02-environment-variables.md) | Bütün env dəyişənləri (secret dəyərsiz) |
| 3 | [03-deployment-runbook.md](03-deployment-runbook.md) | Addım-addım deployment proseduru |
| 4 | [04-rollback-runbook.md](04-rollback-runbook.md) | Uğursuz deployment/migration üçün geri qayıtma |
| 5 | [05-database-backup-restore.md](05-database-backup-restore.md) | pg_dump/pg_restore proseduru (Phase 21 əsaslı) |
| 6 | [06-storage-recovery.md](06-storage-recovery.md) | Local + S3-compatible storage bərpası |
| 7 | [07-payment-incident-runbook.md](07-payment-incident-runbook.md) | Epoint payment insident halları |
| 8 | [08-security-incident-runbook.md](08-security-incident-runbook.md) | Credential leak, IDOR, abuse cavab planı |
| 9 | [09-monitoring-alerting.md](09-monitoring-alerting.md) | Metric → threshold → severity → action |
| 10 | [10-smoke-test-checklist.md](10-smoke-test-checklist.md) | Customer/Admin/Payment manual checklist (boş) |
| 11 | [11-disaster-recovery.md](11-disaster-recovery.md) | RTO/RPO target-lər + ssenarilər |
| 12 | [12-credential-rotation.md](12-credential-rotation.md) | Bütün credential-lər üçün rotation proseduru |
| 13 | [13-production-handover.md](13-production-handover.md) | Yekun handover sənədi (bütün bölmələrin xülasəsi) |
| 14 | [14-final-deployment-checklist.md](14-final-deployment-checklist.md) | Boş final deployment checklist (Phase 30) |
| 15 | [15-client-asset-requirements.md](15-client-asset-requirements.md) | 22 real şəkil üçün müştəri tələbləri (Phase 25C.3) |

## Status

Phase 25 (staging), Phase 26 (production cutover), Phase 27 (post-launch
audit) — **heç biri hələ icra olunmayıb**. Bax:
[13-production-handover.md § KNOWN BLOCKERS](13-production-handover.md#known-blockers).
