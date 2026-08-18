# STEP6 — Storage Recovery Runbook

Phase 24B arxitekturasına əsaslanır: `src/services/storage/` — `local`
(default) və `s3` (istənilən S3-compatible provider) adapterləri, eyni
`save/remove/exists/getUrl` kontraktı ilə.

## Local storage (`STORAGE_PROVIDER=local`)

| Hal | Prosedur |
|---|---|
| **Missing image** | `uploads/<key>` diskdə yoxdursa, `local.exists(key)` `false` qaytarır. Kök səbəb adətən: (a) deployment zamanı `uploads/` qovluğu ötürülməyib (b) ephemeral fayl sistemli platformada restart faylları silib. **Local storage ephemeral platformada production üçün uyğun deyil** — bax `01-system-inventory.md`. |
| **Orphan file** | Diskdə fayl var, amma heç bir DB sətri ona istinad etmir. Silinmə əməliyyatı DB-dən uğurla keçib, amma faylın özü silinməyib (Phase 24B-nin qərarı: `storage.remove()` mövcud controller-lərə hələ bağlanmayıb — bax aşağı). |
| **Broken URL** | Frontend-ə göndərilən `uploads/<key>` path-i backend domenindən fərqli domen altında render olunmağa çalışılırsa (CORS/domain uyğunsuzluğu). `resolveImageUrl()` nisbi path-ləri backend `VITE_API_URL`-in origin-inə nisbətən qurur — `VITE_API_URL` səhvdirsə bütün şəkillər qırılar. |
| **Bucket access failure** | Tətbiq olunmur (local mode-da bucket yoxdur). |
| **Credential rotation** | Tətbiq olunmur. |

## S3-compatible storage (`STORAGE_PROVIDER=s3`)

| Hal | Prosedur |
|---|---|
| **Missing image** | `s3Adapter.exists(key)` `false` qaytarır (404/NoSuchKey/NotFound `s3StorageAdapter.js`-də səhv kimi deyil, `false` kimi işlənir). Səbəb: fayl heç vaxt uğurla yüklənməyib, və ya bucket-dən kənar silinib. |
| **Orphan file** | Bucket-də obyekt var, DB-də istinad yoxdur. Aşağıdakı audit sorğusu ilə tap (real production DB və bucket siyahısı tələb edir — bu fazada icra edilmir): DB-dəki bütün `image`/`url`/`preview_image` dəyərlərini yığ, bucket-in tam obyekt siyahısı ilə fərqini çıxar. |
| **Broken URL** | `getUrl(key)` = `STORAGE_S3_PUBLIC_URL_BASE + '/' + key`. Bu baza URL səhvdirsə (məs. `s3.save()` zamanı işlədilən `STORAGE_S3_ENDPOINT`-dən fərqli), bucket-ə yazma uğurlu olsa belə oxuma qırıla bilər — hər ikisinin uyğunluğu deploy-dan sonra `03-deployment-runbook.md` § 9-da real upload testi ilə təsdiqlənməlidir. |
| **Bucket access failure** | `s3Adapter.save()` xəta atır → `upload.controller.js` bunu tutub 500 qaytarır (kontrakta görə heç vaxt "uğurlu" saxta cavab qaytarmır). Ehtimal olunan səbəblər: credential-lar dəyişib/expire olub, bucket policy dəyişib, region/endpoint uyğunsuzluğu. |
| **Storage credential rotation** | Bax `12-credential-rotation.md` § R2/S3 credentials. |
| **DB/storage consistency** | `06-storage-recovery.md`-in əsas auditidir: hər DB sətrindəki `image`/`url`/`preview_image` üçün müvafiq storage-da `exists()` çağır, uyğunsuzluqları raport et. |

## Phase 24B migration skriptinin davranışı (`scripts/migrateStorageToS3.js`)

Recovery kontekstində vacib olan qərarlar:
- **Dry-run defaultdur** — `--execute` ötürülmədən heç nə yüklənmir.
- **Mənbə fayl heç vaxt silinmir** — hətta `--execute` rejimində belə,
  local diskdəki orijinal fayl toxunulmaz qalır. Bu, storage recovery
  zamanı S3-ə keçiddən sonra belə local kopyanın fallback kimi
  mövcud qalmasını təmin edir.
- **DB heç vaxt yenilənmir** — skript yalnız bir JSON manifest yazır
  (`migration-manifest-<ts>.json`, köhnə path → yeni key/URL). DB-nin
  faktiki yenilənməsi ayrı, əl ilə nəzərdən keçirilən addımdır.
- Əskik mənbə fayl fatal xəta sayılmır — hesabatda "missing" kimi
  qeyd olunur, prosess davam edir.

Bu davranış recovery ssenarisində əhəmiyyətlidir: skriptin özü heç vaxt
məlumat itkisinə səbəb ola bilməz (nə fayl silmir, nə DB yazır) — səhv
nəticə yalnız manifest-in yanlış tətbiqindən (əl ilə DB update-dən) irəli
gələ bilər.

## Real cloud E2E

Bu fazada **real S3/R2 credential mövcud deyil** — real bucket üzərində
upload/exists/remove sınağı BLOCKED-dir. Phase 24B-də bu adapterlərin
məntiqi yalnız local mock S3 HTTP server (`http.createServer`,
`127.0.0.1`) ilə sınanıb — bu, real cloud E2E əvəzi **deyil**, sadəcə
request/response strukturunun doğruluğunu göstərir. Real E2E Phase 25-də
real staging credential-ları ilə icra olunacaq.
