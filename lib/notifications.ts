import { createAdminClient } from "@/lib/supabase/admin";

type NotifyInput = {
  type:
    | "ORDER_CONFIRMATION"
    | "ORDER_STATUS_UPDATE"
    | "PAYMENT_CONFIRMED"
    | "LOW_STOCK"
    | "VENDOR_APPROVED"
    | "GENERIC";
  to: string;
  subject: string;
  body: string;
  userId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Send (or queue) an email notification.
 * - If RESEND_API_KEY is set, sends via Resend.
 * - Always writes a row to notification_logs for audit.
 * Safe to call from API routes / server code only.
 */
export async function sendNotification(input: NotifyInput): Promise<{
  ok: boolean;
  skipped?: boolean;
  error?: string;
}> {
  const admin = createAdminClient();
  let status: "PENDING" | "SENT" | "FAILED" | "SKIPPED" = "PENDING";
  let errorMessage: string | null = null;

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.NOTIFICATION_FROM_EMAIL || "VendorFlow <onboarding@resend.dev>";

  if (!input.to) {
    status = "SKIPPED";
    errorMessage = "No recipient email";
  } else if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [input.to],
          subject: input.subject,
          text: input.body,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        status = "FAILED";
        errorMessage = errBody || `Resend HTTP ${res.status}`;
      } else {
        status = "SENT";
      }
    } catch (err) {
      status = "FAILED";
      errorMessage = err instanceof Error ? err.message : "Send failed";
    }
  } else {
    // No email provider configured — log only (dev-friendly)
    status = "SKIPPED";
    errorMessage = "RESEND_API_KEY not set; notification logged only";
    console.info("[notification]", input.type, input.to, input.subject);
  }

  await admin.from("notification_logs").insert({
    type: input.type,
    recipient_email: input.to,
    recipient_user_id: input.userId || null,
    subject: input.subject,
    body: input.body,
    metadata: input.metadata || {},
    status,
    error_message: errorMessage,
    sent_at: status === "SENT" ? new Date().toISOString() : null,
  });

  return {
    ok: status === "SENT" || status === "SKIPPED",
    skipped: status === "SKIPPED",
    error: errorMessage || undefined,
  };
}

export function orderConfirmationEmail(order: {
  order_number: string;
  customer_name: string;
  total_amount: number;
  order_status: string;
}) {
  return {
    subject: `Order confirmed — ${order.order_number}`,
    body: [
      `Hi ${order.customer_name},`,
      ``,
      `Thanks for your order on VendorFlow.`,
      ``,
      `Order: ${order.order_number}`,
      `Total: ₦${Number(order.total_amount).toLocaleString()}`,
      `Status: ${order.order_status.replace(/_/g, " ")}`,
      ``,
      `We will notify you when payment is confirmed and when your order ships.`,
      ``,
      `— VendorFlow`,
    ].join("\n"),
  };
}

export function orderStatusEmail(order: {
  order_number: string;
  customer_name: string;
  order_status: string;
}) {
  return {
    subject: `Order update — ${order.order_number}`,
    body: [
      `Hi ${order.customer_name},`,
      ``,
      `Your order ${order.order_number} is now: ${order.order_status.replace(/_/g, " ")}.`,
      ``,
      `Track your order in your account dashboard.`,
      ``,
      `— VendorFlow`,
    ].join("\n"),
  };
}

export function lowStockEmail(product: {
  name: string;
  sku: string;
  stock_quantity: number;
}) {
  return {
    subject: `Low stock alert — ${product.name}`,
    body: [
      `Product "${product.name}" (SKU: ${product.sku}) is low on stock.`,
      `Current quantity: ${product.stock_quantity}`,
      ``,
      `Please restock soon.`,
      ``,
      `— VendorFlow`,
    ].join("\n"),
  };
}
