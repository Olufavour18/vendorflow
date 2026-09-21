# VendorFlow — Current Project Map

> Generated for organization/documentation. **No runtime paths were moved.**  
> Source of truth remains the repository layout below.

```
VendorFlow/
│
├── Frontend (Next.js App Router)
│   ├── app/
│   │   ├── page.tsx                 # Store homepage
│   │   ├── layout.tsx, globals.css
│   │   ├── (store)/                 # Customer marketplace
│   │   │   ├── products/            # Catalog + product detail [slug]
│   │   │   ├── cart/
│   │   │   └── checkout/
│   │   ├── (account)/               # Customer account + addresses + orders
│   │   ├── (admin)/                 # Admin dashboard, products, orders, categories
│   │   ├── vendor/                  # Vendor dashboard, products, inventory, orders, register
│   │   ├── staff/                   # Warehouse / delivery / support board
│   │   ├── auth/                    # Login, register
│   │   └── payment/callback/        # Paystack return
│   ├── components/
│   │   ├── product/                 # ProductCard, AddToCartButton
│   │   ├── account/                 # AddressBook
│   │   ├── admin/                   # Category hierarchy, image upload, delete
│   │   ├── layout/                  # Header
│   │   ├── auth/
│   │   ├── ui/                      # Button, Card, Input, Label
│   │   └── …
│   ├── hooks/                       # Reserved (empty placeholder)
│   ├── types/                       # Reserved (empty placeholder)
│   └── public/                      # Static assets (if present)
│
├── Backend / Server
│   ├── app/api/
│   │   ├── paystack/
│   │   │   ├── initialize/          # Start Paystack charge
│   │   │   ├── verify/              # Verify transaction + stock + n8n event
│   │   │   └── webhook/             # Paystack charge.success
│   │   ├── notify/order/            # Order email helper
│   │   └── automation/emit/         # Forward order_id events to n8n
│   ├── lib/
│   │   ├── supabase/                # client, server, admin, middleware
│   │   ├── store/                   # Zustand cart + cart-db sync
│   │   ├── orders/stock.ts          # Atomic stock RPC client
│   │   ├── notifications.ts
│   │   ├── automation.ts            # n8n webhook emit
│   │   ├── product-utils.ts
│   │   └── …
│   └── middleware.ts                # Auth session refresh / route protection
│
├── Database (Supabase)
│   └── supabase/migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_vendors_and_cart.sql
│       ├── 003_seed_data.sql
│       ├── 004_rls_policies.sql
│       ├── 005_storage_and_notifications.sql
│       ├── 006_product_variants_and_catalog.sql
│       ├── 007_multi_vendor_security.sql
│       └── 008_n8n_automation_stock_rpc.sql
│
├── Commerce domains (logical — code lives in app/ + lib/)
│   ├── Products + variants + categories
│   ├── Cart + checkout
│   ├── Orders + order_items
│   └── Inventory / stock RPC
│
├── Users (roles in profiles.role)
│   ├── customer | vendor | admin | warehouse | delivery | support
│
├── Payments
│   ├── Paystack (initialize → verify → webhook)
│   └── Bank transfer (PENDING until admin confirms)
│
├── Notifications
│   ├── lib/notifications.ts + notification_logs
│   └── app/api/notify/order
│
├── Automation
│   └── n8n/
│       ├── README.md
│       ├── workflows/
│       ├── documentation/
│       ├── payloads/
│       └── examples/
│
└── Documentation
    └── docs/                        # Architecture & domain docs (this folder)
```

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
