# Notifications

| Piece | Location |
|-------|----------|
| Send helper | lib/notifications.ts |
| Order API | app/api/notify/order |
| Audit | notification_logs |
| Channel | Resend if RESEND_API_KEY set |

Types: ORDER_CONFIRMATION, ORDER_STATUS_UPDATE, PAYMENT_CONFIRMED, LOW_STOCK, VENDOR_APPROVED, GENERIC.

n8n can send operational emails independently.
