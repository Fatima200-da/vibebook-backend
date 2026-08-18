# STEP5 — Database Backup & Restore Runbook

Phase 21-də təsdiqlənmiş prosedura əsaslanır (real backup, real restore
disposable DB-yə, row-count müqayisəsi ilə doğrulanıb). Bu fazada
**real backup yaradılmır** — yalnız prosedur sənədləşdirilir, çünki real
production DB hələ mövcud deyil.

## Backup

```bash
pg_dump --format=custom --file="vibebook_backup_<YYYYMMDD_HHMMSS>.dump" "$DATABASE_URL"
```

`--format=custom` seçilib çünki paralel restore-a icazə verir və
`pg_restore --list` ilə məzmunun əvvəlcədən yoxlanmasına imkan yaradır
(sadə `.sql` text dump-dan fərqli olaraq).

### Backup naming

`vibebook_backup_<YYYYMMDD_HHMMSS>.dump` — həm avtomatlaşdırılmış, həm
manual backup-lar üçün eyni konvensiya, xronoloji sıralamanı asanlaşdırır.
Migration-dan əvvəlki backup-lara əlavə olaraq `_pre_migration_<migration_name>`
suffiksi əlavə edilməlidir ki, hansı backup-ın hansı migration-a
uyğun olduğu qarışmasın.

### Frequency (təklif, real infrastruktur seçildikdən sonra
platformanın öz avtomatlaşdırılmış backup-ı ilə birləşdirilməlidir)

- Gündəlik avtomatik full backup (aşağı trafikli saatda).
- Hər production migration-dan **dərhal əvvəl** əlavə manual backup —
  `03-deployment-runbook.md` § 1.

### Retention

- Gündəlik backup-lar: son 30 gün.
- Migration-dan-əvvəl backup-lar: son 5 migration üçün saxlanılır (heç
  vaxt avtomatik silinmir, əl ilə təmizlənir).

Bu ədədlər ilkin təklifdir — real saxlama xərci/platform limitləri
məlum olduqdan sonra yenidən qiymətləndirilməlidir.

## Restore (doğrulama proseduru — Phase 21-də bu addımlar real icra
edilib və uğurlu olub)

```bash
# 1. Ayrıca, disposable test DB yarat (heç vaxt production DB üzərinə birbaşa restore etmə)
createdb vibebook_restore_test

# 2. Restore et
pg_restore --clean --if-exists --no-owner --dbname=vibebook_restore_test "vibebook_backup_<ts>.dump"

# 3. Sətir sayını müqayisə et (əsas cədvəllər)
psql vibebook_restore_test -c "SELECT 'orders', count(*) FROM orders UNION ALL SELECT 'payments', count(*) FROM payments UNION ALL SELECT 'albums', count(*) FROM albums UNION ALL SELECT 'users', count(*) FROM users;"

# 4. Əlaqələri yoxla (orphan = 0 gözlənilir — bax 11-disaster-recovery.md)
psql vibebook_restore_test -c "SELECT count(*) FROM order_items oi LEFT JOIN orders o ON o.id = oi.order_id WHERE o.id IS NULL;"

# 5. Test DB-ni sil
dropdb vibebook_restore_test
```

### Restore verification meyarı

- Addım 3-dəki sətir sayları backup alınan anda mənbə DB-dəki sayla
  **dəqiq üst-üstə düşməlidir**.
- Addım 4-dəki orphan sorğusu `0` qaytarmalıdır.
- Restore prosesi xəta vermədən tamamlanmalıdır (`pg_restore` exit code 0).

## Storage backup ilə DB backup arasında consistency

DB backup-ı ilə storage (local disk və ya S3 bucket) backup-ı **eyni an
üçün** uyğunlaşdırılmalıdır — DB-dəki `image`/`url` sütunları storage-da
mövcud olmayan fayllara işarə edərsə, restore-dan sonra "broken image"
halı yaranar. Praktik qayda: DB backup-ı götürüləndən dərhal sonra (və ya
əvvəl) storage snapshot/versioning-i də tetiklə, ikisini eyni
timestamp-lə etiketlə.

## Migration-dan əvvəl backup requirement

`03-deployment-runbook.md` § 1 — **hər** `prisma migrate deploy`
çağırışından əvvəl backup məcburidir, istisnasız. Bu qayda Phase 21-in
əsas nəticəsidir: 17+ fazalıq sənədsiz `db push` sürüşməsi yalnız real
backup mövcud olduğu üçün risksiz baseline edilə bildi.
