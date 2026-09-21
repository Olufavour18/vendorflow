import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ShippingAddress = {
  full_name?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  landmark?: string;
  label?: string;
};

export default async function VendorOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirect=/vendor/orders");

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, business_name, status")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!vendor) redirect("/vendor/register");

  const { data: items, error } = await supabase
    .from("order_items")
    .select(
      `id, quantity, unit_price, total_price, product_name, product_sku,
       variant_label, variant_sku, order_id,
       orders (
         id, order_number, order_status, payment_status, created_at,
         customer_name, customer_phone, shipping_address, total_amount
       )`
    )
    .eq("vendor_id", vendor.id)
    .order("created_at", { ascending: false });

  type ItemRow = NonNullable<typeof items>[number];
  const byOrder = new Map<
    string,
    {
      order: NonNullable<ItemRow["orders"]>;
      lines: ItemRow[];
      vendorSubtotal: number;
    }
  >();

  for (const row of items || []) {
    const ord = row.orders as {
      id: string;
      order_number: string;
      order_status: string;
      payment_status: string;
      created_at: string;
      customer_name: string;
      customer_phone: string;
      shipping_address: ShippingAddress;
      total_amount: number;
    } | null;
    if (!ord) continue;
    const existing = byOrder.get(ord.id);
    if (existing) {
      existing.lines.push(row);
      existing.vendorSubtotal += Number(row.total_price);
    } else {
      byOrder.set(ord.id, {
        order: ord,
        lines: [row],
        vendorSubtotal: Number(row.total_price),
      });
    }
  }

  const groups = Array.from(byOrder.values()).sort(
    (a, b) =>
      new Date(b.order.created_at).getTime() -
      new Date(a.order.created_at).getTime()
  );

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
          <p className="text-muted-foreground mt-1">
            Only orders that include your products. You cannot see other
            vendors' line items or payment credentials.
          </p>
        </div>
        <Link href="/vendor">
          <Button variant="outline">Back to dashboard</Button>
        </Link>
      </div>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error.message}
        </div>
      )}

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No orders for your products yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map(({ order, lines, vendorSubtotal }) => {
            const ship = (order.shipping_address || {}) as ShippingAddress;
            return (
              <Card key={order.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg">
                      {order.order_number}
                    </CardTitle>
                    <div className="flex gap-2 text-xs">
                      <span className="rounded-full bg-muted px-2 py-0.5">
                        {order.order_status}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5">
                        Payment: {order.payment_status}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Your items</p>
                    <ul className="space-y-1">
                      {lines.map((l) => (
                        <li key={l.id} className="flex justify-between gap-4">
                          <span>
                            {l.product_name}
                            {l.variant_label ? ` (${l.variant_label})` : ""} ×{" "}
                            {l.quantity}
                          </span>
                          <span>
                            ₦{Number(l.total_price).toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="font-medium pt-2">
                      Your subtotal: ₦{vendorSubtotal.toLocaleString()}
                    </p>
                  </div>

                  <div className="text-sm border-t pt-3 space-y-1">
                    <p className="font-medium">Delivery (for fulfillment)</p>
                    <p>
                      {ship.full_name || order.customer_name}
                      {ship.phone || order.customer_phone
                        ? ` · ${ship.phone || order.customer_phone}`
                        : ""}
                    </p>
                    {ship.label && (
                      <p className="text-muted-foreground">{ship.label}</p>
                    )}
                    <p className="text-muted-foreground">
                      {[ship.address_line1, ship.address_line2]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p className="text-muted-foreground">
                      {[ship.city, ship.state].filter(Boolean).join(", ")}
                    </p>
                    {ship.landmark && (
                      <p className="text-muted-foreground">
                        Landmark: {ship.landmark}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
