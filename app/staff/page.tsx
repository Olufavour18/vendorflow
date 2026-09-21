import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STAFF_ROLES = ["admin", "warehouse", "delivery", "support"] as const;

export default async function StaffBoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/staff");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "customer";
  if (!STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number])) {
    redirect("/account");
  }

  // Role-focused queues
  const warehouseStatuses = [
    "PAYMENT_CONFIRMED",
    "STOCK_CHECK",
    "STOCK_CONFIRMED",
    "ORDER_PROCESSING",
    "PACKED",
    "READY_FOR_DELIVERY",
  ];
  const deliveryStatuses = [
    "READY_FOR_DELIVERY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "DELIVERY_FAILED",
  ];

  const statuses =
    role === "delivery"
      ? deliveryStatuses
      : role === "warehouse"
      ? warehouseStatuses
      : [...new Set([...warehouseStatuses, ...deliveryStatuses])];

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, total_amount, order_status, payment_status, created_at"
    )
    .in("order_status", statuses)
    .order("created_at", { ascending: true })
    .limit(50);

  const { data: lowStock } = await supabase
    .from("products")
    .select("id, name, sku, stock_quantity, low_stock_threshold")
    .lte("stock_quantity", 5)
    .eq("status", "ACTIVE")
    .limit(20);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff board</h1>
          <p className="text-muted-foreground mt-1">
            Role: <span className="capitalize font-medium">{role}</span>
            {profile?.full_name ? ` · ${profile.full_name}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {role === "admin" && (
            <Link href="/admin">
              <Button variant="outline">Admin</Button>
            </Link>
          )}
          <Link href="/">
            <Button variant="outline">Store</Button>
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Orders in your queue</CardDescription>
            <CardTitle className="text-3xl">{orders?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Low stock products</CardDescription>
            <CardTitle className="text-3xl">{lowStock?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">
          {role === "delivery" ? "Delivery queue" : "Fulfillment queue"}
        </h2>
        {!orders || orders.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No orders in this queue right now.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Card key={o.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div>
                    <p className="font-medium">{o.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {o.customer_name} · {o.customer_phone}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {o.order_status.replace(/_/g, " ")} · Payment{" "}
                      {o.payment_status}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      ₦{Number(o.total_amount).toLocaleString()}
                    </span>
                    <Link href={`/admin/orders/${o.id}`}>
                      <Button size="sm" variant="outline">
                        Update
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {(role === "warehouse" || role === "admin") && lowStock && lowStock.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Low stock alerts</h2>
          <div className="space-y-2">
            {lowStock.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-3 flex justify-between text-sm">
                  <span>
                    {p.name} ({p.sku})
                  </span>
                  <span className="text-destructive font-medium">
                    Qty: {p.stock_quantity}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
