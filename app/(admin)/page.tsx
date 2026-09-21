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

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: productCount },
    { count: orderCount },
    { count: pendingOrders },
    { count: categoryCount },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "PENDING"),
    supabase
      .from("categories")
      .select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage products, orders and your store
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/products">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardDescription>Total Products</CardDescription>
              <CardTitle className="text-3xl">{productCount ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/orders">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardDescription>Total Orders</CardDescription>
              <CardTitle className="text-3xl">{orderCount ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/orders?status=PENDING_PAYMENT">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardDescription>Pending Payments</CardDescription>
              <CardTitle className="text-3xl">{pendingOrders ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/categories">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardDescription>Categories</CardDescription>
              <CardTitle className="text-3xl">{categoryCount ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/orders">
          <Button>Manage Orders</Button>
        </Link>
        <Link href="/admin/products">
          <Button variant="outline">Manage Products</Button>
        </Link>
        <Link href="/admin/products/new">
          <Button variant="outline">Add New Product</Button>
        </Link>
        <Link href="/admin/categories">
          <Button variant="outline">Manage Categories</Button>
        </Link>
      </div>
    </div>
  );
}
