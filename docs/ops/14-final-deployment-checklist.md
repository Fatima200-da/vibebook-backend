# STEP15 — Final Deployment Checklist (Phase 30)

Bu checklist **boş saxlanılıb** — Phase 30 yalnız deployment-ready
konfiqurasiya hazırlayır, real deployment etmir. Hər maddə real staging
(Phase 25) və production (Phase 26) icrası zamanı işarələnəcək.

```
[ ] Render PostgreSQL yaradıldı
[ ] Render Web Service yaradıldı
[ ] Render Static Site yaradıldı
[ ] R2 bucket yaradıldı
[ ] R2 credentials yaradıldı
[ ] DATABASE_URL əlavə edildi
[ ] JWT_SECRET əlavə edildi
[ ] CORS_ORIGIN əlavə edildi
[ ] STORAGE_* əlavə edildi
[ ] Backend deploy edildi
[ ] Migration deploy edildi
[ ] Health check PASS
[ ] Frontend deploy edildi
[ ] R2 upload E2E PASS
[ ] Customer E2E PASS
[ ] Admin E2E PASS
[ ] Security smoke PASS
[ ] Responsive PASS
[ ] i18n PASS
[ ] Performance PASS
[ ] Backup/restore PASS
```

## Bu maddələr hara istinad edir

- `render.yaml` (backend) və `vibebook-frontend/render.yaml` — Render
  Web Service / Static Site / rewrite spesifikasiyası.
- `02-environment-variables.md` — hər env dəyişəninin tam siyahısı.
- `03-deployment-runbook.md` — icra ardıcıllığı.
- `10-smoke-test-checklist.md` — Customer/Admin/Payment addım-addım.
- `05-database-backup-restore.md` — Backup/restore proseduru.

## Qeyd

Bu fayl yalnız checklist-in strukturunu təmin edir — heç bir sətir bu
fazada `[x]`-ə çevrilməyib, çünki heç bir real Render/R2/staging
əməliyyatı icra olunmayıb (Phase 30-un öz qadağan siyahısı).
