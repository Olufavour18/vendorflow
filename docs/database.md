# Database (Supabase)

Migrations `001`–`008` are the schema source. Do not edit applied migrations.

| File | Purpose |
|------|---------|
| 001 | Core schema, enums |
| 002 | Vendors, cart, product.vendor_id |
| 003 | Seed |
| 004 | RLS |
| 005 | Storage, notification_logs |
| 006 | Variants, catalog |
| 007 | Multi-vendor security |
| 008 | Stock RPC, order_events, fulfillment_method |

## Relationships

profiles → addresses; profiles → vendors → products → product_variants; orders → order_items / payments / order_events; shipping_address JSONB snapshot on orders.

## RPC

`deduct_order_stock(p_order_id)`, `generate_order_number()`, `owns_vendor`, `is_admin`, `is_staff`.
