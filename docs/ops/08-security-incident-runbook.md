# STEP8 — Security Incident Runbook

## JWT secret leak

**Təsir**: sızmış `JWT_SECRET` ilə istənilən rolda (admin daxil) saxta
token imzalana bilər.
1. Dərhal yeni `JWT_SECRET` yarat (bax `12-credential-rotation.md`).
2. Backend-i yeni açarla yenidən deploy et — **bu, mövcud bütün
   sessiyaları etibarsız edir** (gözlənilən yan-təsir, qəbul edilməlidir).
3. `audit_logs`-u sızıntı vaxtından bəri şübhəli admin əməliyyatları
   üçün nəzərdən keçir.
4. Sızıntının mənbəyini tap (repo commit, log faylı, env dump) və bağla.

## Database credential leak

1. Dərhal DB provider-in idarəetmə panelindən (real provider seçildikdən
   sonra) parolu/connection-string-i rotasiya et.
2. `DATABASE_URL`-i yenilə, backend-i yenidən deploy et.
3. DB access log-larını (provider dəstəkləyirsə) sızıntı vaxtından bəri
   naməlum IP-lərdən bağlantı üçün yoxla.
4. Şübhəli məlumat dəyişikliyi aşkar olunarsa → `05-database-backup-restore.md`
   ilə son təmiz backup-a qayıtmağı qiymətləndir.

## R2/S3 credential leak

1. Provider konsolundan köhnə access key-i dərhal deaktiv et, yeni
   yarat.
2. `STORAGE_S3_ACCESS_KEY_ID`/`STORAGE_S3_SECRET_ACCESS_KEY`-i yenilə,
   backend-i yenidən deploy et.
3. Bucket-in access log-unu (provider dəstəkləyirsə) naməlum silmə/yükləmə
   üçün yoxla — `06-storage-recovery.md`-dəki orphan/missing audit-i
   sızıntı sonrası bir daha icra et.

## Payment private key leak

**Ən yüksək prioritet.** `PAYMENT_PRIVATE_KEY` sızarsa saxta imzalı
webhook-lar göndərilə bilər (`epointClient.verifySignature` saxta
imzanı doğru kimi qəbul edər).
1. Epoint merchant portalından açarı dərhal ləğv et/yenisini yarat.
2. `PAYMENT_PRIVATE_KEY`-i yenilə, backend-i yenidən deploy et.
3. Açar dəyişənə qədər gələn bütün webhook-ları (`payments` cədvəlində
   sızıntı vaxtından bəri statusu dəyişən sətirlər) əl ilə yoxla —
   hər `PAID` keçidinin real provider transaction-ına uyğun olduğunu
   provider dashboard-u ilə təsdiq et.

## Suspicious login attempts

`authLimiter` artıq 15 dəqiqədə 10 cəhdlə IP-ni məhdudlaşdırır
(`src/middleware/rateLimiters.js`). Bunu üstələyən (paylanmış, çox-IP-li)
brute-force aşkarlanarsa:
1. Hədəf hesab(lar)ın parolunu məcburi sıfırla (mümkün olan endpoint
   vasitəsilə) və ya admin hesabını müvəqqəti deaktiv et.
2. Monitoring-də (bax `09-monitoring-alerting.md`) 401 spike threshold-unu
   üstələyən IP-ləri tap, provider-in firewall/WAF imkanı varsa blokla.

## IDOR report

Phase 20/23-də IDOR auditı bütün owned-resource endpoint-lərində
(albums, orders, payments, addresses, wishlist) `req.user.id`
yoxlaması ilə bağlanıb. Yeni IDOR şübhəsi bildirilərsə:
1. Bildirilən endpoint-i və konkret sənədi (hansı ID, hansı istifadəçi)
   izolə et.
2. Müvafiq controller-də ownership yoxlamasının (`=== req.user.id`)
   mövcud olduğunu kod səviyyəsində təsdiq/inkar et.
3. Real boşluq tapılarsa: fix-i deploy et, sonra sızmış ola biləcək
   məlumatın əhatəsini (hansı istifadəçi hansı başqasının datasına
   baxıb ola bilər) DB audit ilə qiymətləndir.

## Abnormal payment activity

Eyni kart/IP-dən qısa müddətdə çoxlu `FAILED` cəhd, ya da eyni order-ə
çoxlu ödəniş cəhdi (`paymentCreateLimiter` — 15 dəqiqədə 20 cəhd —
üstələnməsi): `07-payment-incident-runbook.md` ilə birlikdə araşdır,
kart testing (stolen card fraud) ehtimalını nəzərə al.

## Upload abuse

Magic-byte doğrulaması (`upload.controller.js`) real şəkil olmayan
faylları rədd edir, `MAX_IMAGE_UPLOAD_BYTES` (20 MiB) ölçü limitini
qoyur. Kütləvi/təkrarlanan upload cəhdi ilə disk/bucket doldurmaq
təhlükəsi yaranarsa: `paymentCreateLimiter`-ə bənzər ayrıca upload
rate-limiter əlavə etmək qiymətləndirilməlidir (hazırda `/api/upload`
yalnız blanket `/api` limiterinə tabedir — 15 dəqiqədə 100 sorğu).

## Rate-limit abuse

Blanket limiter (`app.js`, 100 req/15dəq) və ya `authLimiter`/
`paymentCreateLimiter` davamlı üstələnirsə: mənbə IP-ni müəyyən et,
provider səviyyəsində (real hosting seçildikdən sonra) əlavə WAF/IP-block
tətbiq et — Express-səviyyəli limiter tək başına DDoS-a qarşı kifayət
deyil, yalnız tək-instansiyalı sui-istifadəyə qarşıdır.

## Secret rotation və deployment restart ardıcıllığı (ümumi)

1. Yeni credential-ı provider konsolunda yarat (köhnəni **hələ**
   ləğv etmə).
2. Yeni dəyəri env konfiqurasiyasına yaz.
3. Backend-i yenidən deploy et.
4. `03-deployment-runbook.md` § 8 (health check) və müvafiq funksional
   test (login, upload, payment — hansı credential dəyişibsə) ilə yeni
   açarın işlədiyini təsdiq et.
5. Yalnız təsdiqdən **sonra** köhnə credential-ı provider konsolundan
   ləğv et (bax `12-credential-rotation.md`).

Sıra vacibdir: köhnə açarı yeni işlədiyini təsdiqləmədən ləğv etmək
canlı kəsintiyə səbəb ola bilər.
