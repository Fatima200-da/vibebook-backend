# STEP12 — Credential Rotation Checklist

Ümumi ardıcıllıq (bax `08-security-incident-runbook.md` § Secret rotation
ardıcıllığı): **yarat → deploy → doğrula → köhnəni ləğv et**. Heç vaxt
əks sıra ilə.

## `JWT_SECRET`

1. **Rotation**: yeni 64+ simvollu təsadüfi string yarat (məs.
   `openssl rand -base64 48`).
2. **Deploy**: env dəyişənini yenilə, backend-i yenidən deploy et.
3. **Verification**: yeni login token-in işlədiyini təsdiq et. **Diqqət**:
   bu rotasiya bütün mövcud sessiyaları (admin daxil) etibarsız edir —
   planlaşdırılmış aşağı-trafik pəncərəsində edilməlidir.
4. **Old credential revocation**: `JWT_SECRET`-in "ləğvi" konseptual
   deyil — köhnə açar sadəcə artıq istifadə olunmur, açarın özü heç
   yerdə saxlanılmır.

## Database credentials (`DATABASE_URL`)

1. **Rotation**: DB provider konsolundan yeni parol/rol yarat (real
   provider seçildikdən sonra).
2. **Deploy**: `DATABASE_URL`-i yenilə, backend-i yenidən deploy et.
3. **Verification**: `03-deployment-runbook.md` § 3 (DB connectivity)
   və § 8 (health check).
4. **Old credential revocation**: köhnə DB istifadəçisini/parolunu
   yalnız yeni bağlantı təsdiqləndikdən sonra provider konsolundan sil.

## R2/S3 credentials (`STORAGE_S3_ACCESS_KEY_ID`/`STORAGE_S3_SECRET_ACCESS_KEY`)

1. **Rotation**: provider konsolundan yeni access key cütü yarat
   (köhnəni silmədən).
2. **Deploy**: iki dəyəri yenilə, backend-i yenidən deploy et.
3. **Verification**: `03-deployment-runbook.md` § 9 (storage validation)
   — real upload/exists testi.
4. **Old credential revocation**: yeni key ilə real upload təsdiqləndikdən
   sonra köhnə access key-i provider konsolundan deaktiv et.

## Epoint private key (`PAYMENT_PRIVATE_KEY`, `PAYMENT_PUBLIC_KEY`)

1. **Rotation**: Epoint merchant portalından yeni açar cütü tələb et.
2. **Deploy**: hər iki dəyəri yenilə, backend-i yenidən deploy et.
3. **Verification**: `10-smoke-test-checklist.md` § Payment (yalnız real
   credential mövcud olduqda mümkündür).
4. **Old credential revocation**: yeni açarla real (kiçik məbləğli)
   test ödənişi uğurla tamamlandıqdan sonra köhnə açarı Epoint
   portalından ləğv et.

## API tokens (hosting/monitoring/CI provider-ləri)

1. **Rotation**: hər provider-in öz konsolundan yeni token yarat.
2. **Deploy**: CI/CD secret store-unda (real platform seçildikdən sonra)
   yenilə.
3. **Verification**: növbəti deployment-in yeni token ilə uğurla
   keçdiyini təsdiq et.
4. **Old credential revocation**: köhnə token-i provider konsolundan sil.

## Ümumi qadağa

Bu fazada heç bir credential real olaraq dəyişdirilmir — yuxarıdakılar
yalnız prosedurdur. Real rotasiya yalnız müvafiq real infrastruktur
mövcud olduqda icra edilə bilər.
