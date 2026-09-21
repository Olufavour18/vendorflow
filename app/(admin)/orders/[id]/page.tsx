"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "STOCK_CHECK",
  "STOCK_CONFIRMED",
  "ORDER_PROCESSING",
  "PACKED",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "PAYMENT_FAILED",
  "OUT_OF_STOCK",
  "ORDER_CANCELLED",
  "DELIVERY_FAILED",
  "REFUND_PENDING",
  "REFUNDED",
] as const;

const PAYMENT_STATUSES = [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;

type OrderItem = {
  id: string;
  product_name: string;
  product_sku: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  total_amount: number;
  order_status: string;
  payment_status: string;
  shipping_address: {
    full_name?: string;
    phone?: string;
    email?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    landmark?: string;
  };
  notes: string | null;
  internal_notes: string | null;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
};

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError || !orderData) {
        setError(orderError?.message || "Order not found");
        setLoading(false);
        return;
      }

      setOrder(orderData as Order);
      setOrderStatus(orderData.order_status);
      setPaymentStatus(orderData.payment_status);
      setInternalNotes(orderData.internal_notes || "");

      const { data: itemsData } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      setItems((itemsData as OrderItem[]) || []);
      setLoading(false);
    }

    load();
  }, [orderId]);

  const handleSave = async () => {
    if (!order) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();

    const updates: Record<string, unknown> = {
      order_status: orderStatus,
      payment_status: paymentStatus,
      internal_notes: internalNotes || null,
    };

    if (paymentStatus === "SUCCESS" && !order.paid_at) {
      updates.paid_at = new Date().toISOString();
    }
    if (orderStatus === "DELIVERED" && !order.delivered_at) {
      updates.delivered_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", order.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    // Keep payments table in sync when payment status changes
    if (paymentStatus !== order.payment_status) {
      await supabase
        .from("payments")
        .update({
          status: paymentStatus,
          ...(paymentStatus === "SUCCESS"
            ? { paid_at: new Date().toISOString(), verified_at: new Date().toISOString() }
            : {}),
        })
        .eq("order_id", order.id);
    }

    setOrder({
      ...order,
      order_status: orderStatus,
      payment_status: paymentStatus,
      internal_notes: internalNotes || null,
      paid_at:
        paymentStatus === "SUCCESS" && !order.paid_at
          ? new Date().toISOString()
          : order.paid_at,
      delivered_at:
        orderStatus === "DELIVERED" && !order.delivered_at
          ? new Date().toISOString()
          : order.delivered_at,
    });

    setSuccess("Order updated successfully");
    setSaving(false);
    router.refresh();
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading order...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive mb-4">{error || "Order not found"}</p>
        <Link href="/admin/orders">
          <Button variant="outline">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  const addr = order.shipping_address || {};

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {order.order_number}
          </h1>
          <p className="text-muted-foreground mt-1">
            Placed{" "}
            {new Date(order.created_at).toLocaleString("en-NG", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Link href="/admin/orders">
          <Button variant="outline">Back to Orders</Button>
        </Link>
      </div>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-sm text-green-800 bg-green-50 rounded-md">
          {success}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer & address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{order.customer_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">{order.customer_phone}</p>
            </div>
            {order.customer_email && (
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium break-all">{order.customer_email}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">{addr.full_name || order.customer_name}</p>
            <p>{addr.address_line1}</p>
            {addr.address_line2 && <p>{addr.address_line2}</p>}
            <p>
              {addr.city}
              {addr.state ? `, ${addr.state}` : ""}
            </p>
            {addr.landmark && (
              <p className="text-muted-foreground">Landmark: {addr.landmark}</p>
            )}
            {addr.phone && <p>Phone: {addr.phone}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 items-center border-b last:border-0 pb-3 last:pb-0"
              >
                <div className="w-12 h-12 rounded bg-muted overflow-hidden shrink-0">
                  {item.product_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      —
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    SKU: {item.product_sku} · Qty: {item.quantity}
                  </p>
                </div>
                <p className="font-medium shrink-0">
                  ₦{Number(item.total_price).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₦{Number(order.subtotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>₦{Number(order.shipping_fee).toLocaleString()}</span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-₦{Number(order.discount_amount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-1">
              <span>Total</span>
              <span>₦{Number(order.total_amount).toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Update Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderStatus">Order Status</Label>
              <select
                id="orderStatus"
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <select
                id="paymentStatus"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="internalNotes">Internal Notes</Label>
            <textarea
              id="internalNotes"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Notes visible only to staff..."
            />
          </div>

          {order.notes && (
            <div className="text-sm">
              <p className="text-muted-foreground">Customer notes</p>
              <p className="mt-1">{order.notes}</p>
            </div>
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
