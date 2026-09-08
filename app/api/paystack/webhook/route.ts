import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    // Verify webhook signature
    const hash = crypto
      .createHmac("sha512", secretKey)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event === "charge.success") {
      const data = event.data;
      const orderId = data.metadata?.order_id;
      const reference = data.reference;

      if (orderId) {
        const admin = createAdminClient();

        await admin
          .from("payments")
          .update({
            status: "SUCCESS",
            gateway_reference: reference,
            gateway_response: data,
            paid_at: new Date().toISOString(),
            verified_at: new Date().toISOString(),
          })
          .eq("order_id", orderId);

        await admin
          .from("orders")
          .update({
            payment_status: "SUCCESS",
            order_status: "PAYMENT_CONFIRMED",
            paid_at: new Date().toISOString(),
          })
          .eq("id", orderId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Paystack webhook error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
