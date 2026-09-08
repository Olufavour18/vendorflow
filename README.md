# VendorFlow — AI-Powered Commerce & Fulfillment Platform

A full-stack commerce automation platform that enables customers to discover products, place and pay for orders, while automating payment verification, inventory confirmation, warehouse fulfillment, delivery coordination, customer notifications, reporting and post-purchase marketing through **n8n**.

## Features

- Professional e-commerce storefront with hero images & categories
- Customer accounts & order tracking
- Real order creation (orders + order items + payments)
- Payment method selection (Paystack + Bank Transfer)
- Warehouse stock confirmation workflow (planned)
- Full order state machine
- Delivery management (planned)
- Customer notifications (Email / WhatsApp / SMS) (planned)
- Admin dashboard with analytics (planned)
- AI Business Assistant (planned)
- n8n as the central automation engine

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend / Database**: Supabase (PostgreSQL + Auth + Storage)
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
│   ├── layout/               # Header, Footer, Sidebar
│   ├── product/              # ProductCard, Gallery, etc.
│   ├── order/                # OrderCard, Timeline, StatusBadge
│   ├── cart/
│   ├── account/
│   └── admin/
├── lib/
│   ├── supabase/             # Supabase clients
│   ├── store/                # Zustand cart store
│   └── utils.ts
├── types/
├── hooks/
├── supabase/
│   └── migrations/           # SQL schema + seed files
└── n8n/                      # n8n workflow exports (optional)
```

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a Supabase project at https://supabase.com
4. Run the migrations in order in the Supabase SQL Editor:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_vendors_and_cart.sql`
   - `supabase/migrations/003_seed_data.sql`  ← demo products + categories
5. Copy `.env.local.example` to `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```
6. Run the development server: `npm run dev`
7. Open http://localhost:3000

### Important Notes

- The seed file adds 8 sample products with Unsplash images so the store looks real immediately.
- Checkout now creates real rows in `orders`, `order_items` and `payments`.
- Account page (`/account`) shows welcome message, profile info and the user’s order history.
- For production you should add Row Level Security (RLS) policies and a proper Paystack webhook.

---

**Status**: Phase 1 complete + Storefront + Cart + Real Orders + Account Dashboard
