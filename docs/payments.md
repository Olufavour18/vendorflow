# Payments

```
PAYMENTS
├── Paystack: initialize → verify → webhook
└── Bank Transfer: PENDING until admin confirms
```

Paystack success sets payment_status SUCCESS, order PAYMENT_CONFIRMED, runs stock RPC, emits payment.confirmed to n8n.

Bank transfer never auto-paid. Secrets: PAYSTACK_SECRET_KEY server-only.
