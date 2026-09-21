import { NextRequest, NextResponse } from "next/server";
import {
  sendNotification,
  orderConfirmationEmail,
  orderStatusEmail,
} from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/notify/order
 * body: { orderId: string, type: "ORDER_CONFIRMATION" | "ORDER_STATUS_UPDATE" }
 * Uses service role to load order + send email (Resend if configured).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, type } = body as {
      orderId?: string;
      type?: "ORDER_CONFIRMATION" | "ORDER_STATUS_UPDATE";
    };

    if (!orderId || !type) {
      return NextResponse.json(
        { error: "orderId and type are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: order, error } = await admin
      .from("orders")
      .select(
        "id, order_number, customer_name, customer_email, total_amount, order_status, user_id"
      )
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: error?.message || "Order not found" },
        { status: 404 }
      );
    }

    if (!order.customer_email) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "No customer email",
      });
    }

    const template =
      type === "ORDER_CONFIRMATION"
        ? orderConfirmationEmail(order)
        : orderStatusEmail(order);

    const result = await sendNotification({
      type,
      to: order.customer_email,
      subject: template.subject,
      body: template.body,
      userId: order.user_id,
      metadata: { orderId: order.id, order_number: order.order_number },
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[notify/order]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
