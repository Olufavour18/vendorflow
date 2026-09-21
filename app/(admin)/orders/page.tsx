import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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

function statusBadgeClass(status: string) {
  if (status === "DELIVERED" || status === "PAYMENT_CONFIRMED")
    return "bg-green-100 text-green-800";
  if (
    status === "PENDING_PAYMENT" ||
    status === "STOCK_CHECK" ||
    status === "ORDER_PROCESSING" ||
    status === "PACKED" ||
    status === "READY_FOR_DELIVERY" ||
    status === "OUT_FOR_DELIVERY"
  )
    return "bg-yellow-100 text-yellow-800";
  if (
    status === "PAYMENT_FAILED" ||
    status === "ORDER_CANCELLED" ||
    status === "DELIVERY_FAILED" ||
    status === "OUT_OF_STOCK"
  )
    return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

function paymentBadgeClass(status: string) {
  if (status === "SUCCESS") return "bg-green-100 text-green-800";
  if (status === "PENDING") return "bg-yellow-100 text-yellow-800";
  if (status === "FAILED") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status || "";

  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_email, customer_phone, total_amount, order_status, payment_status, created_at"
    )
    .order("created_at", { ascending: false });

  if (statusFilter && ORDER_STATUSES.includes(statusFilter as (typeof ORDER_STATUSES)[number])) {
    query = query.eq("order_status", statusFilter);
  }

  const { data: orders } = await query;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground mt-1">
            {orders?.length ?? 0} order{(orders?.length ?? 0) !== 1 ? "s" : ""}
            {statusFilter ? ` · filtered by ${statusFilter.replace(/_/g, " ").toLowerCase()}` : ""}
          </p>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/orders">
          <Button
            variant={!statusFilter ? "default" : "outline"}
            size="sm"
          >
            All
          </Button>
        </Link>
        {[
          "PENDING_PAYMENT",
          "PAYMENT_CONFIRMED",
          "ORDER_PROCESSING",
          "PACKED",
          "OUT_FOR_DELIVERY",
          "DELIVERED",
          "ORDER_CANCELLED",
        ].map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`}>
            <Button
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
            >
              {s.replace(/_/g, " ")}
            </Button>
          </Link>
        ))}
      </div>

      {!orders || orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No orders found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{order.order_number}</p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        statusBadgeClass(order.order_status)
                      }`}
                    >
                      {order.order_status.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        paymentBadgeClass(order.payment_status)
                      }`}
                    >
                      {order.payment_status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {order.customer_name}
                    {order.customer_phone ? ` · ${order.customer_phone}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(order.created_at).toLocaleString("en-NG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <p className="font-semibold">
                    ₦{Number(order.total_amount).toLocaleString()}
                  </p>
                  <Link href={`/admin/orders/${order.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
