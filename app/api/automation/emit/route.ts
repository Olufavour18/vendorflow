import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emitAutomationEvent, type AutomationEventType } from "@/lib/automation";

/**
 * POST /api/automation/emit
 * Body: { event, order_id }
 * Verifies the caller owns the order (or is staff) before forwarding to n8n.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = body.event as AutomationEventType;
    const orderId = body.order_id as string;

    if (!event || !orderId) {
      return NextResponse.json(
        { error: "event and order_id required" },
        { status: 400 }
      );
    }

    const allowed: AutomationEventType[] = [
      "order.created",
      "payment.confirmed",
      "payment.failed",
    ];
    if (!allowed.includes(event)) {
      return NextResponse.json({ error: "event not allowed" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: order } = await supabase
      .from("orders")
      .select(
        "id, order_number, user_id, payment_method, payment_status, order_status"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.user_id) {
      if (!user || user.id !== order.user_id) {
        const { data: profile } = user
          ? await supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .maybeSingle()
          : { data: null };
        const role = profile?.role;
        if (
          !role ||
          !["admin", "warehouse", "support", "delivery"].includes(role)
        ) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    const result = await emitAutomationEvent(event, {
      order_id: order.id,
      order_number: order.order_number,
      payment_method: order.payment_method as string | null,
      payment_status: order.payment_status as string | null,
      order_status: order.order_status as string | null,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[automation/emit]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
