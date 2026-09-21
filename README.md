# VendorFlow — AI-Powered Commerce & Fulfillment Platform

Full-stack multi-vendor marketplace: storefront, vendor portal, admin, staff ops, Paystack, and optional n8n automation.

> **Organization note:** Application behavior and UI are unchanged. System documentation lives under [`docs/`](./docs/).

## Documentation index

| Doc | Contents |
|-----|----------|
| [docs/PROJECT_MAP.md](./docs/PROJECT_MAP.md) | Full repository map |
| [docs/architecture.md](./docs/architecture.md) | Layers & sources of truth |
| [docs/database.md](./docs/database.md) | Migrations, tables, RLS, RPCs |
| [docs/commerce.md](./docs/commerce.md) | Products → cart → checkout → orders |
| [docs/vendors.md](./docs/vendors.md) | Multi-vendor isolation |
| [docs/auth.md](./docs/auth.md) | Roles & auth |
| [docs/payments.md](./docs/payments.md) | Paystack & bank transfer |
| [docs/notifications.md](./docs/notifications.md) | Email & logs |
| [docs/automation.md](./docs/automation.md) | n8n events & pipeline |
| [docs/CHECKLIST.md](./docs/CHECKLIST.md) | **Done vs next** checklist |
| [n8n/README.md](./n8n/README.md) | Workflow import guide |

## Tech stack

- Next.js 15 + TypeScript + Tailwind + UI primitives
- Supabase (Auth, PostgreSQL, RLS, Storage)
- Paystack
- Optional n8n + Google Sheets reporting

## Project structure (summary)

```
app/           # Pages + API routes (App Router)
components/    # React UI pieces
lib/           # Server/client utilities, Supabase, cart, stock, notifications
supabase/      # SQL migrations 001–008
n8n/           # Workflow JSON + automation docs
docs/          # Architecture & domain documentation
```

## Getting started

1. `npm install`
2. Create a Supabase project
3. Run migrations **in order** in the SQL Editor (`supabase/migrations/001` … `008` as needed)
4. Copy `.env.local.example` → `.env.local` and fill variables (**never commit secrets**)
5. Supabase Auth: enable Email OTP if using code login
6. Paystack webhook (production): `https://your-domain.com/api/paystack/webhook`
7. Optional: set `N8N_WEBHOOK_URL` and import `n8n/workflows/vendorflow-order-automation.json`
8. Promote yourself: `profiles.role = 'admin'`
9. `npm run dev` → http://localhost:3000

## Routes (unchanged)

| Path | Description |
|------|-------------|
| `/` | Store homepage |
| `/products` | Marketplace catalog |
| `/cart` | Cart |
| `/checkout` | Checkout + payment |
| `/auth/login` | Password or email OTP |
| `/account` | Customer dashboard |
| `/vendor` | Vendor dashboard |
| `/admin` | Admin |
| `/staff` | Staff operations |

## Environment variable names

See `.env.local.example`.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_SECRET_KEY`
- `RESEND_API_KEY`
- `NOTIFICATION_FROM_EMAIL`
- `N8N_WEBHOOK_URL`
- `N8N_WEBHOOK_SECRET`
- `ADMIN_EMAIL`

## License / status

Private marketplace MVP. Preserve migrations and RLS when extending.
