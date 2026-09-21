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
import { getExpiryStatus, isLowStock } from "@/lib/product-utils";

export default async function VendorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/vendor");
  }

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, business_name, status, slug, city, state")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!vendor) {
    redirect("/vendor/register");
  }

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, status, stock_quantity, low_stock_threshold, expires_at, product_variants(stock_quantity, low_stock_threshold, expires_at)"
    )
    .eq("vendor_id", vendor.id);

  const list = products || [];
  let lowStock = 0;
  let outOfStock = 0;
  let nearExpiry = 0;
  let active = 0;
  let inactive = 0;

  for (const p of list) {
    if (p.status === "ACTIVE") active++;
    if (p.status === "INACTIVE" || p.status === "DRAFT" || p.status === "ARCHIVED")
      inactive++;

    const variants = (p.product_variants as {
      stock_quantity: number;
      low_stock_threshold: number | null;
      expires_at: string | null;
    }[]) || [];

    const stock =
      variants.length > 0
        ? variants.reduce((s, v) => s + v.stock_quantity, 0)
        : p.stock_quantity;

    if (stock <= 0) outOfStock++;
    else if (
      variants.length > 0
        ? variants.some((v) =>
            isLowStock(v.stock_quantity, v.low_stock_threshold)
          )
        : isLowStock(p.stock_quantity, p.low_stock_threshold)
    ) {
      lowStock++;
    }

    const dates = [
      p.expires_at,
      ...variants.map((v) => v.expires_at),
    ].filter(Boolean) as string[];
    if (dates.some((d) => getExpiryStatus(d) === "near_expiry")) nearExpiry++;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {vendor.business_name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Status:{" "}
            <span className="font-medium capitalize">
              {vendor.status.toLowerCase()}
            </span>
            {vendor.city ? ` · ${vendor.city}, ${vendor.state}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/">
            <Button variant="outline">View store</Button>
          </Link>
          <Link href="/vendor/products">
            <Button variant="outline">My Products</Button>
          </Link>
          <Link href="/vendor/orders">
            <Button variant="outline">My Orders</Button>
          </Link>
          {vendor.status === "APPROVED" && (
            <Link href="/vendor/products/new">
              <Button>Add product</Button>
            </Link>
          )}
        </div>
      </div>

      {vendor.status === "PENDING" && (
        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-900 text-sm">
          Your vendor account is pending admin approval.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>My Products</CardDescription>
            <CardTitle className="text-3xl">{list.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl">{active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactive / draft</CardDescription>
            <CardTitle className="text-3xl">{inactive}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Low stock</CardDescription>
            <CardTitle className="text-3xl text-yellow-700">{lowStock}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Out of stock</CardDescription>
            <CardTitle className="text-3xl text-red-700">{outOfStock}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Near expiry</CardDescription>
            <CardTitle className="text-3xl text-orange-700">
              {nearExpiry}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/vendor/products">
          <Button>My Products</Button>
        </Link>
        <Link href="/vendor/orders">
          <Button variant="outline">My Orders</Button>
        </Link>
        <Link href="/vendor/products?stock=low">
          <Button variant="outline">Low stock list</Button>
        </Link>
        <Link href="/vendor/products?expiry=near">
          <Button variant="outline">Near expiry</Button>
        </Link>
      </div>
    </div>
  );
}
