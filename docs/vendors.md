# Multi-Vendor

```
Marketplace (shared categories + public ACTIVE products)
│
├── Vendor A → products / variants / inventory / order lines
├── Vendor B → products / variants / inventory / order lines
└── Admin → platform-wide management
```

| Resource | Ownership |
|----------|-----------|
| vendors | owner_id → profiles |
| products | vendor_id |
| product_variants | via product |
| order_items | vendor_id snapshot at checkout |
| orders | customer user_id; vendors see if they have line items |

UI: `/vendor`, `/vendor/products`, `/vendor/orders`. Isolation via RLS (`owns_vendor`) + filters.
