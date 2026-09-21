# System Architecture

## Sources of truth

| Layer | Role |
|-------|------|
| **Supabase** | Primary source of truth (data + Auth + RLS + Storage) |
| **Next.js API / server** | Secure application logic |
| **Paystack** | Payment verification for online pay |
| **n8n** | Automation / orchestration |
| **Google Sheets** | Reporting (via n8n, optional) |
| **Frontend** | User interface only |

## High-level flow

Customer UI → Cart → Checkout → Orders + Items + Payments → Paystack/Bank → `payment_status=SUCCESS` → `deduct_order_stock` RPC → n8n events → Admin/Staff/Vendor UIs.

## Stack

Next.js 15 App Router, React 19, Tailwind, Zustand cart, Supabase, Paystack, optional n8n.

## Principles

1. Do not trust the client for ownership (RLS + server).
2. Order address is a JSONB snapshot.
3. Multi-vendor isolation via `vendor_id` on products and order_items.
4. Stock via atomic RPC.
5. n8n receives `order_id` + event, loads data from Supabase.
