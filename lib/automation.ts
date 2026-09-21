/**
 * Fire-and-forget events to n8n (or any webhook consumer).
 * Only sends order_id + event type — n8n loads full data from Supabase.
 */

export type AutomationEventType =
  | "order.created"
  | "payment.confirmed"
  | "payment.failed"
  | "stock.insufficient"
  | "order.status_changed";

export async function emitAutomationEvent(
  event: AutomationEventType,
  payload: {
    order_id: string;
    order_number?: string | null;
    payment_method?: string | null;
    payment_status?: string | null;
    order_status?: string | null;
    [key: string]: unknown;
  }
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) {
    return { ok: true, skipped: true };
  }

  const secret = process.env.N8N_WEBHOOK_SECRET;
  const body = {
    event,
    order_id: payload.order_id,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (secret) {
      headers["X-VendorFlow-Secret"] = secret;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[automation] n8n webhook failed", res.status, text);
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[automation] n8n webhook error", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "webhook error",
    };
  }
}
