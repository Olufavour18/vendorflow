# Commerce Flow

```
Customer
  → Browse /products (ACTIVE, all vendors)
  → Product detail + variants
  → Add to cart (Zustand; optional DB cart)
  → Checkout
      → Select / enter delivery address (snapshot to orders.shipping_address)
      → PAYSTACK or BANK_TRANSFER
  → Order + order_items (vendor_id, variant snapshot)
  → Payment
  → Stock RPC (on SUCCESS)
  → Vendor My Orders / Admin / Staff fulfillment
```

## Product model

- Category hierarchy (`parent_id`)
- Product: price, discount_percent, stock, status, condition, expires_at
- Variants: own price/stock/SKU/expiry
- Vendor ownership via `vendor_id`

## Inventory

- Display stock on storefront
- Authoritative decrement: `deduct_order_stock`
- Low stock: `low_stock_threshold` on product/variant
