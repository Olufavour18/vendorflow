# VendorFlow — AI-Powered Commerce & Fulfillment Platform

A full-stack commerce automation platform that enables customers to discover products, place and pay for orders, while automating payment verification, inventory confirmation, warehouse fulfillment, delivery coordination, customer notifications, reporting and post-purchase marketing through **n8n**.

## Features

- Professional e-commerce storefront
- Customer accounts & order tracking
- Payment verification (Paystack + Bank Transfer)
- Warehouse stock confirmation workflow
- Full order state machine
- Delivery management
- Customer notifications (Email / WhatsApp / SMS)
- Admin dashboard with analytics
- AI Business Assistant
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
│   ├── utils.ts
│   └── constants.ts
├── types/
├── hooks/
├── public/
├── supabase/
│   └── migrations/           # SQL schema files
└── n8n/                      # n8n workflow exports (optional)
```

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Supabase and add environment variables
4. Run the development server: `npm run dev`

---

**Status**: Phase 1 – Foundation (Database schema + project setup)
