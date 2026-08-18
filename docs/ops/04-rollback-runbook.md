# STEP4 — Rollback Runbook

## Failed backend deployment

Yeni backend release health check-dən keçmirsə və ya crash edirsə:
1. Platform-un əvvəlki uğurlu release-inə (image/commit) geri qayıt.
2. `GET /api/health` yenidən 200 qaytardığını təsdiq et.
3. Əgər son deployment migration daxil edirdisə, əvvəl "Failed migration"
   bölməsinə bax — kod rollback-i tək başına DB-ni geri qaytarmır.

## Failed frontend deployment

Static host-un əvvəlki build artifact-ını yenidən aktivləşdir (əksər
platformalarda instant, atomic əməliyyatdır). `VITE_API_URL` səhv
dəyərlə build edilibsə, düzgün dəyərlə **yenidən build** lazımdır —
runtime-da düzəldilə bilməz (bax `02-environment-variables.md`).

## Failed migration

**Prisma-nın avtomatik down-migration mexanizmi yoxdur.** Bir migration
yarımçıq və ya səhv tətbiq olunubsa:
1. Backend-i dərhal dayandır (yeni sorğuların uyğunsuz schema ilə
   işləməsinin qarşısını al).
2. `prisma migrate status` ilə hansı migration-ın "Applied" işarələnib,
   hansının yarımçıq qaldığını müəyyən et.
3. Kod dəyişikliyi ilə "irəli düzəlişi" (forward-fix migration) yazmaq
   həmişə backup-dan restore-dan üstündür, əgər mümkündürsə.
4. Forward-fix mümkün deyilsə: `05-database-backup-restore.md`-dəki
   prosedurla addım 1-də götürülmüş backup-ı restore et. Bu, migration-dan
   *əvvəlki* backup tələb edir — buna görə deployment runbook-un 1-ci
   addımı (backup) məcburidir.
5. **Real DB-də** `prisma migrate reset` və ya əl ilə şema redaktəsi
   işlətmə — yalnız backup restore və ya forward-fix.

## Broken storage

`STORAGE_PROVIDER=s3` konfiqurasiyası səhvdirsə (yanlış credential,
bucket əlçatan deyil): `STORAGE_PROVIDER=local`-a müvəqqəti geri qayıt
(yeni yükləmələr local diskə düşər), problemi düzəlt, sonra
`06-storage-recovery.md`-dəki "DB/storage consistency" bölməsinə uyğun
son 2 saat ərzində local-a düşmüş faylları S3-ə köçür (`scripts/migrateStorageToS3.js`).
Bu keçid DB-dəki `image`/`url` sütunlarının formatını dəyişdirmir —
`resolveImageUrl()` hər iki formatı şəffaf dəstəkləyir (Phase 24B).

## Broken payment

`isPaymentConfigured()` `false` qaytardıqda (hər hansı `PAYMENT_*`
dəyəri əskikdirsə) `/api/payments/create` avtomatik 503 qaytarır —
saxta uğur simulyasiya edilmir. Əgər provider tərəfində fasilə varsa
(credential düzgündür, amma Epoint əlçatan deyil): yeni ödəniş
cəhdləri `502 PROVIDER_UNREACHABLE` alacaq, mövcud `PENDING` ödənişlər
toxunulmadan qalır (webhook sonradan gələndə normal işlənəcək). Heç bir
DB dəyişikliyi tələb olunmur — bax `07-payment-incident-runbook.md`.

## Corrupted production data

1. Zərəri dayandır: zədələnmiş yazıya (order/album/payment) təsir edən
   funksionallığı müvəqqəti söndür, əlavə yazılmanı dayandır.
2. Zərərin əhatəsini müəyyən et (`11-disaster-recovery.md`-dəki orphan
   sorğularından istifadə et).
3. Tək sətir korrupsiyası → mümkünsə backup-dan yalnız həmin sətri
   bərpa et (`pg_restore` ilə tam restore yerinə).
4. Geniş korrupsiya → tam backup restore, `05-database-backup-restore.md`.
5. Kök səbəbi tapılmadan production-u yenidən aça bilməzsən — təkrarlana
   bilər.

## Ümumi prinsip

Rollback qərarı həmişə: *"real trafik daha da zərər görməzdən əvvəl
sistemi son bilinən-sağlam vəziyyətə qaytarmaq"* — yeni "düzəliş" cəhdi
production-da canlı sınanmır, əvvəl fayl/rollback, sonra düzəliş
staging-də hazırlanıb yenidən deploy olunur.
