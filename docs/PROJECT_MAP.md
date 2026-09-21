# VendorFlow — Current Project Map

> Generated for organization/documentation. **No runtime paths were moved.**

See repository `docs/PROJECT_MAP.md` in the working tree for the full tree diagram covering Frontend (`app/`, `components/`), Backend (`app/api/`, `lib/`), Database (`supabase/migrations/001`–`008`), Commerce, Users, Payments, Notifications, Automation (`n8n/`), and Documentation (`docs/`).

## Route index (unchanged)

| Path | Audience |
|------|----------|
| `/`, `/products`, `/products/[slug]`, `/cart`, `/checkout` | Customer marketplace |
| `/account` | Customer |
| `/auth/login`, `/auth/register` | Auth |
| `/vendor`, `/vendor/products`, `/vendor/orders`, `/vendor/register` | Vendor |
| `/admin`, `/admin/products`, `/admin/orders`, `/admin/categories` | Admin |
| `/staff` | Staff |
| `/payment/callback` | Paystack return |
| `/api/paystack/*`, `/api/notify/*`, `/api/automation/*` | Server APIs |
