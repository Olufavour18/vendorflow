# VendorFlow ↔ n8n Automation

There was **no existing n8n workflow**. This folder contains a production-oriented workflow built against the **real** VendorFlow schema.

## What the app already does

| Step | App behaviour |
|------|----------------|
| Order create | Checkout inserts `orders` + `order_items` (+ `vendor_id`) + `payments` (PENDING) |
| Emit `order.created` | `POST /api/automation/emit` → `N8N_WEBHOOK_URL` (order_id only) |
| Paystack success | Verify + webhook set `payment_status=SUCCESS`, `order_status=PAYMENT_CONFIRMED` |
| Atomic stock | RPC `deduct_order_stock(order_id)` — row locks, no oversell, idempotent |
| Emit `payment.confirmed` | After first successful pay (verify/webhook) |
| Bank transfer | Stays PENDING until **admin** marks paid (no auto-confirm) |

## Environment (Next.js)

```env
N8N_WEBHOOK_URL=https://your-n8n.example/webhook/vendorflow-orders
N8N_WEBHOOK_SECRET=optional-shared-secret
ADMIN_EMAIL=admin@example.com
DELIVERY_STAFF_EMAIL=
WAREHOUSE_EMAIL=
```

## Supabase migration

Run after 001–07:

```text
supabase/migrations/008_n8n_automation_stock_rpc.sql
```

Adds `orders.fulfillment_method`, `order_events`, RPC `deduct_order_stock(uuid)`.

## Import workflow

1. Open n8n → Workflows → Import from File
2. Import `n8n/workflows/vendorflow-order-automation.json`
3. Set Supabase (service role), Email, Google Sheets credentials
4. Activate → copy Production Webhook URL into `N8N_WEBHOOK_URL`

## Flow

```
Webhook (order.created | payment.confirmed | payment.failed)
  → payment.failed → admin alert → STOP
  → load order + items from Supabase
  → if payment not SUCCESS (e.g. bank transfer) → admin alert → STOP stock path
  → RPC deduct_order_stock (atomic)
  → if fail → admin + ops → STOP
  → group by vendor_id → notify admin + customer
  → low stock alerts
  → DELIVERY → delivery staff | PICKUP → warehouse
  → Google Sheets sales row
```

## Security

- Webhook body: **order_id + event** only (no card data).
- n8n uses **service role**; vendors never see `payments.gateway_response`.
- Stock only via **RPC** with `FOR UPDATE` (no racey get→update in n8n).

## Bank transfer after admin confirms

```http
POST /api/automation/emit
{ "event": "payment.confirmed", "order_id": "<uuid>" }
```

(Staff/admin session when not the order owner.)

## Test

1. Apply migration 008
2. Set env + activate n8n workflow
3. Paystack test order → stock once, emails, sheet row
4. Bank transfer → admin email only until SUCCESS
