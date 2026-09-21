# n8n Automation

```
n8n/
├── README.md
├── workflows/vendorflow-order-automation.json
├── documentation/
├── payloads/
└── examples/
```

Events: order.created, payment.confirmed, payment.failed (order_id + event).

Pipeline: webhook → load order/items → if not SUCCESS admin bank alert → RPC stock → notify → delivery/pickup → Google Sheets.

Env: N8N_WEBHOOK_URL, N8N_WEBHOOK_SECRET, ADMIN_EMAIL; n8n needs Supabase service role.
