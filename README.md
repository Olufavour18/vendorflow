# VendorFlow — AI-Powered Commerce & Fulfillment Platform

A full-stack commerce automation platform that enables customers to discover products, place and pay for orders, while automating payment verification, inventory confirmation, warehouse fulfillment, delivery coordination, customer notifications, reporting and post-purchase marketing through **n8n**.

## Features

- Professional e-commerce storefront with hero images & categories
- Customer accounts & order tracking
- Real order creation (orders + order items + payments)
- Payment method selection (Paystack + Bank Transfer)
- **Row Level Security (RLS)** on all tables
- Warehouse stock confirmation workflow (planned)
- Full order state machine
- Delivery management (planned)
- Customer notifications (Email / WhatsApp / SMS) (planned)
- Admin dashboard with analytics (planned)
- AI Business Assistant (planned)
- n8n as the central automation engine

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend / Database**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Automation**: n8n
- **Payments**: Paystack / Flutterwave
- **Notifications**: Resend, WhatsApp Business API, Termii

## Project Structure

```
vendorflow/
├── app/
│   ├── (store)/              # Public customer store
│   ├── (account)/            # Customer account dashboard
│   ├── (admin)/              # Admin dashboard
│   ├── auth/                 # Login / Register
│   ├── api/                  # API routes (webhooks, etc.)
│   └── layout.tsx
├── components/
│   ├── ui/                   # shadcn components
│   ├── layout/               # Header, Footer
│   ├── product/              # ProductCard, AddToCartButton
│   ├── auth/                 # SignOutButton
│   └── ...
├── lib/
│   ├── supabase/             # Supabase clients
│   ├── store/                # Zustand cart store
│   └── utils.ts
├── supabase/
│   └── migrations/           # SQL schema + seed + RLS
└── n8n/
```

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a Supabase project at https://supabase.com
4. Run the migrations **in order** in the Supabase SQL Editor:
   - `001_initial_schema.sql`
   - `002_vendors_and_cart.sql`
   - `003_seed_data.sql`        ← demo products + categories
   - `004_rls_policies.sql`     ← Row Level Security (important!)
5. Copy `.env.local.example` to `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```
6. Run the development server: `npm run dev`
7. Open http://localhost:3000

### Making yourself an Admin

After registering, go to Supabase → Table Editor → `profiles` and change your `role` to `admin`.

---

**Status**: Storefront + Auth + Cart + Real Orders + Account + RLS complete
