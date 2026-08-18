# STEP7 — Payment Incident Runbook

Phase 18/19-da qurulmuş arxitekturaya əsaslanır
(`src/controllers/payment.controller.js`, `src/services/epointClient.js`,
`src/config/payment.js`). `payments.status` və `orders.status` **ayrı
sütunlardır, ayrı state machine-lərdir** — bu runbook boyu bu ayrım
qorunur: heç bir addım payment statusunu fulfillment (order) statusuna
avtomatik köçürmür.

## payment stuck PENDING

Kod davranışı: yeni `createPayment` çağırışı eyni sifariş üçün mövcud
`PENDING` ödənişi 15 dəqiqə (`PENDING_PAYMENT_TTL_MS`) bloklayır
(`payment.controller.js:15,72-84`), sonra avtomatik "abandoned" sayılır
və yeni cəhdə icazə verilir.

Insident prosedur: 15 dəqiqədən çox `PENDING` qalan ödəniş — müştəri
bank səhifəsini bağlayıb, ya da webhook gəlməyib.
1. `GET /api/payments/:id/status` ilə cari statusu təsdiq et.
2. Provider-in öz status endpoint-i (`epointClient.js` real credential
   ilə) ilə həqiqi vəziyyəti soruş — **yalnız real credential varsa
   mümkündür**, əks halda bu addım BLOCKED.
3. Provider "FAILED"/"cancelled" deyirsə → payment sətrini əl ilə
   `FAILED`-ə keçir, order toxunulmaz qalır (müştəri yenidən cəhd edə
   bilər).
4. Provider "PAID" deyir, amma webhook heç vaxt gəlməyibsə → aşağıdakı
   "provider says PAID but local DB does not" bölməsinə keç.

## provider timeout

`createPayment`-də provider sorğusu uğursuz olarsa (`502
PROVIDER_UNREACHABLE`), payment sətri dərhal `FAILED`-ə keçirilir
(`payment.controller.js:129-142`) — heç vaxt `PENDING` vəziyyətdə asılı
qalmır. Müştəri yenidən cəhd edə bilər, əvvəlki `FAILED` sətir bloklamır.

## FAILED payment

Gözlənilən, normal hal — order `Pending` statusunda qalır, müştəri
Checkout-a qayıdıb yenidən ödəniş cəhd edə bilər. Heç bir əl ilə
müdaxilə tələb olunmur, insident sayılmır.

## retry

Müştəri eyni order üçün yenidən ödəniş cəhd etdikdə: əgər əvvəlki cəhd
`FAILED`/`REFUNDED` statusundadırsa yeni `payments` sətri yaradılır
(bloklama yoxdur). Əgər əvvəlki `PENDING` və TTL bitməyibsə `409
PAYMENT_IN_PROGRESS` qaytarılır (qəsdən — ikiqat ödəniş qarşısını alır).

## duplicate webhook

Kod: `payment.controller.js:280-331`. İki qat qoruma:
1. Sürətli-yol yoxlaması: artıq terminal statusda (`PAID`/`FAILED`/`REFUNDED`)
   olan ödəniş dərhal `200 "Already processed"` qaytarır, heç nə yazılmır.
2. Əsl təminat: atomik `updateMany` — `WHERE id=... AND status NOT IN
   (terminal)`. Yalnız "qazanan" sorğu sətri yeniləyir, `count===0` olan
   bütün digərləri "Already processed" alır. Postgres bunu race
   condition-suz təmin edir.

Insident kimi əl müdaxiləsi tələb olunmur — bu, dizayn üzrə idempotentdir.

## invalid webhook signature

`epointClient.verifySignature(data, signature)` `false` qaytarırsa,
sorğu `401`-lə rədd edilir, **heç bir payment sətri toxunulmur**
(`payment.controller.js:266-269`). Tez-tez baş verərsə (Phase 8-də
addressed): brute-force/tampering cəhdi ehtimalı — `08-security-incident-runbook.md`
§ "abnormal payment activity"-yə keç.

## amount mismatch

Webhook-dan gələn məbləğ (`decoded.amount`) DB-dəki `payment.amount`-dan
`0.01`-dən çox fərqlənərsə (`AMOUNT_TOLERANCE`), payment **PAID
edilmir**, `PENDING` qalır, `200` qaytarılır (Epoint-in təkrar cəhdinin
qarşısını almaq üçün), amma nəticə loglanır (`payment.controller.js:292-304`).
Bu, mütləq əl ilə araşdırma tələb edən yeganə haldır — DB korrupsiyası,
provider tərəfində konfiqurasiya səhvi, ya da tamperinq ehtimalı.
Araşdırma: provider-in öz dashboard-unda (real credential lazımdır) real
məbləği yoxla, uyğunlaşdır, yalnız təsdiqdən sonra əl ilə statusu dəyiş.

## customer claims payment succeeded (lakin sistem əks göstərir)

1. `payments.status`-u DB-dən yoxla (frontend-in `PaymentReturnPage`-i
   URL parametrlərinə deyil, yalnız bu backend-verified statusa
   etibar edir — Phase 18-in əsas qərarı).
2. `PENDING`-dirsə → yuxarıdakı "stuck PENDING" prosedurunu izlə.
3. Provider dashboard-unda (real credential) real transaction-ı yoxla.
4. Uyğunsuzluq təsdiqlənərsə (provider PAID deyir, DB yox) → aşağı.

## provider says PAID but local DB does not

Ehtimal olunan səbəb: webhook heç vaxt çatmayıb (şəbəkə, firewall,
`PAYMENT_RESULT_URL` səhv konfiqurasiya). Prosedur:
1. Provider-in webhook-u yenidən göndərmə funksiyası varsa istifadə et
   (provider-ə məxsus, sənədləşdirilməli).
2. Mümkün deyilsə: provider-in status cavabındakı `transaction`/`amount`
   dəyərlərini əl ilə yoxlayıb, `payments.status='PAID'` və
   `provider_transaction_id`-ni **yalnız** provider-in öz təsdiqi əsasında
   əl ilə yenilə — heç vaxt müştərinin sözünə əsaslanaraq.
3. Hər əl ilə statusu dəyişmə əməliyyatı `audit_logs` cədvəlinə
   qeyd olunmalıdır (kim, nə vaxt, hansı əsasla).

## webhook unavailable (provider fasiləsi/şəbəkə problemi)

Payment yaratma (`createPayment`) webhook-dan asılı deyil — dərhal
cavab qaytarır. Yalnız status yenilənməsi webhook-a bağlıdır. Fasilə
müddətində `PENDING` ödənişlər yığılacaq; fasilə bitdikdən sonra provider
adətən öz tərəfindən təkrar göndərmə (retry) edir — kodun idempotent
webhook handler-i bunu təhlükəsiz qəbul edir. Uzun fasilə halında
"provider says PAID but local DB does not" prosedurunu tətbiq et.

## Ümumi qadağa

Bu runbook-un icrası zamanı **real Epoint transaction yaratma və ya
refund etmə** — yalnız artıq mövcud (real) transaction-lar üzərində
oxuma/araşdırma əməliyyatları aparılır. Real provider credential tələb
edən hər addım (provider dashboard yoxlaması, webhook yenidən göndərmə)
credential mövcud olmadıqda **BLOCKED** kimi qeyd olunur.
