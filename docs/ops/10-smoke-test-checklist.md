# STEP10 — Customer/Admin/Payment Smoke-Test Checklist

Manual olaraq hər production deployment zamanı keçilir. **PASS/FAIL
sahələri bu fazada boş saxlanılıb** — real staging/production mövcud
olmadan doldurulması Phase 25/26/27-nin öz nəticələrini uydurmaq
olardı.

## Customer

| # | Addım | PASS/FAIL | Qeyd |
|---|---|---|---|
| 1 | Register | | |
| 2 | Login | | |
| 3 | Products (siyahı, filter) | | |
| 4 | Product Detail | | |
| 5 | Create Album | | |
| 6 | Designer açılışı | | |
| 7 | Template tətbiqi | | |
| 8 | Şəkil upload | | |
| 9 | Save | | |
| 10 | Reload (məlumat itmədən) | | |
| 11 | PDF Preview | | |
| 12 | PDF Export | | |
| 13 | Cart | | |
| 14 | Promo kod | | |
| 15 | Checkout | | |
| 16 | Order yaranması | | |
| 17 | Order History | | |
| 18 | Order Detail | | |
| 19 | Continue Editing (albuma qayıdış) | | |

## Admin

| # | Addım | PASS/FAIL | Qeyd |
|---|---|---|---|
| 1 | Login | | |
| 2 | Dashboard | | |
| 3 | Products CRUD | | |
| 4 | Categories | | |
| 5 | Templates CRUD | | |
| 6 | Orders siyahısı | | |
| 7 | Order status dəyişikliyi | | |
| 8 | Settings | | |

## Payment

| # | Addım | PASS/FAIL | Qeyd |
|---|---|---|---|
| 1 | Create payment | | Yalnız real `PAYMENT_*` credential mövcud olduqda icra edilə bilər — əks halda `BLOCKED` yaz, `N/A` yox |
| 2 | Provider checkout-a redirect | | |
| 3 | Webhook alınması | | |
| 4 | PAID nəticəsi | | |
| 5 | FAILED nəticəsi | | |
| 6 | Return URL manipulyasiyası (tamperinq) rədd edilir | | Bax `07-payment-incident-runbook.md` — frontend URL parametrinə deyil, backend-verified statusa etibar edir |
| 7 | Duplicate webhook idempotent işlənir | | |

## Cross-check: Phase 20 admin/customer token ayrımı

| # | Addım | PASS/FAIL | Qeyd |
|---|---|---|---|
| 1 | Customer token ilə admin endpoint çağırışı rədd edilir (403) | | Phase 20-də təsdiqlənib, hər production deployment-də regressiya olmadığı yenidən yoxlanmalıdır |
| 2 | Admin token ilə customer-only endpoint (`/api/me`, `/api/orders`) gözlənilən kimi işləyir/rədd edilir | | |
