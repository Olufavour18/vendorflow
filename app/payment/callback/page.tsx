"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("Verifying your payment...");

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    const orderId = searchParams.get("order_id");

    if (!reference) {
      setStatus("failed");
      setMessage("No payment reference found.");
      return;
    }

    async function verify() {
      try {
        const params = new URLSearchParams({ reference: reference! });
        if (orderId) params.set("order_id", orderId);

        const res = await fetch(`/api/paystack/verify?${params.toString()}`);
        const data = await res.json();

        if (data.paid) {
          setStatus("success");
          setMessage("Payment successful! Your order has been confirmed.");
          setTimeout(() => router.push("/account?order=success"), 2500);
        } else {
          setStatus("failed");
          setMessage(data.error || "Payment was not successful.");
        }
      } catch {
        setStatus("failed");
        setMessage("Could not verify payment. Please contact support.");
      }
    }

    verify();
  }, [searchParams, router]);

  return (
    <div className="container mx-auto px-4 py-16 flex justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>
            {status === "loading" && "Verifying Payment..."}
            {status === "success" && "Payment Successful 🎉"}
            {status === "failed" && "Payment Failed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{message}</p>
          {status === "loading" && (
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}
          {status === "success" && (
            <p className="text-sm text-muted-foreground">
              Redirecting to your account...
            </p>
          )}
          {status === "failed" && (
            <div className="flex flex-col gap-2">
              <Link href="/cart">
                <Button className="w-full">Back to Cart</Button>
              </Link>
              <Link href="/account">
                <Button variant="outline" className="w-full">
                  My Account
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16 text-center">
          Loading...
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
