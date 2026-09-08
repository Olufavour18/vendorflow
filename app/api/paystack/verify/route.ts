import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const reference = request.nextUrl.searchParams.get("reference");
    const orderId = request.nextUrl.searchParams.get("order_id");

    if (!reference) {
      return NextResponse.json(
        { error: "reference is required" },
        { status: 400 }
      );
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: "Paystack is not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      return NextResponse.json(
        { error: data.message || "Verification failed", paid: false },
        { status: 400 }
      );
    }

    const paid = data.data.status === "success";
    const resolvedOrderId =
      orderId || data.data.metadata?.order_id || null;

    if (paid && resolvedOrderId) {
      const admin = createAdminClient();

      await admin
        .from("payments")
        .update({
          status: "SUCCESS",
          gateway_reference: reference,
          gateway_response: data.data,
          paid_at: new Date().toISOString(),
          verified_at: new Date().toISOString(),
        })
        .eq("order_id", resolvedOrderId);

      await admin
        .from("orders")
        .update({
          payment_status: "SUCCESS",
          order_status: "PAYMENT_CONFIRMED",
          paid_at: new Date().toISOString(),
        })
        .eq("id", resolvedOrderId);
    }

    return NextResponse.json({
      paid,
      status: data.data.status,
      amount: data.data.amount / 100,
      order_id: resolvedOrderId,
    });
  } catch (err) {
    console.error("Paystack verify error:", err);
    return NextResponse.json(
      { error: "Internal server error", paid: false },
      { status: 500 }
    );
  }
}
