import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, email, amount } = body as {
      orderId: string;
      email: string;
      amount: number; // in Naira
    };

    if (!orderId || !email || !amount) {
      return NextResponse.json(
        { error: "orderId, email and amount are required" },
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Amount in kobo (Paystack expects integer)
    const amountInKobo = Math.round(amount * 100);

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amountInKobo,
          currency: "NGN",
          reference: `VF-${orderId}-${Date.now()}`,
          callback_url: `${appUrl}/payment/callback?order_id=${orderId}`,
          metadata: {
            order_id: orderId,
            custom_fields: [
              {
                display_name: "Order ID",
                variable_name: "order_id",
                value: orderId,
              },
            ],
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      return NextResponse.json(
        { error: data.message || "Failed to initialize payment" },
        { status: 400 }
      );
    }

    // Save gateway reference on payment record
    const supabase = await createClient();
    await supabase
      .from("payments")
      .update({
        gateway_reference: data.data.reference,
      })
      .eq("order_id", orderId);

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
    });
  } catch (err) {
    console.error("Paystack initialize error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
