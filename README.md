# VendorFlow — AI-Powered Commerce & Fulfillment Platform

Full-stack commerce platform: storefront, orders, Paystack payments, admin, and email OTP login.

## Features

- Storefront with hero images & product catalog
- Auth: password login + **email OTP (6-digit code, 50s resend timer)**
- Cart + real order creation
- **Paystack** online payments (initialize → pay → verify + webhook)
- Bank transfer option
- Account dashboard (profile + orders)
- **Admin**: dashboard, product list, add product
- Row Level Security on all tables

## Tech Stack

- Next.js 15 + TypeScript + Tailwind + shadcn/ui
- Supabase (Auth, PostgreSQL, RLS)
- Paystack

## Getting Started

1. `git pull && npm install`
2. Create a Supabase project
3. Run migrations **in order** in SQL Editor:
   - `001_initial_schema.sql`
   - `002_vendors_and_cart.sql`
   - `003_seed_data.sql`
   - `004_rls_policies.sql`
4. Copy `.env.local.example` → `.env.local` and fill:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
   PAYSTACK_SECRET_KEY=sk_test_...
   ```
5. **Supabase Auth settings** (for OTP):
   - Authentication → Providers → Email → enable Email OTP / magic link
   - Authentication → Email Templates (optional customize)
   - OTP expiry: set as low as allowed (e.g. 60 seconds). UI resend timer is **50 seconds**.
6. **Paystack webhook** (production):
   - Dashboard → Settings → API → Webhooks
   - URL: `https://your-domain.com/api/paystack/webhook`
7. Make yourself admin: Table Editor → `profiles` → set `role` = `admin`
8. `npm run dev` → http://localhost:3000

### Routes

| Path | Description |
|------|-------------|
| `/` | Store homepage |
| `/products` | Catalog |
| `/cart` | Cart |
| `/checkout` | Checkout + Paystack |
| `/auth/login` | Password or Email Code |
| `/account` | Customer dashboard |
| `/admin` | Admin dashboard (admin role) |
| `/admin/products` | Manage products |
| `/admin/products/new` | Add product |
| `/payment/callback` | Paystack return URL |

---

**Status**: Storefront · Auth (password + OTP) · Cart · Orders · Paystack · Admin products · RLS
