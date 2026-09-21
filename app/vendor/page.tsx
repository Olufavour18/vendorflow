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

  const { data: products, count: productCount } = await supabase
    .from("products")
    .select("id, name, sku, price, stock_quantity, status, images", {
      count: "exact",
    })
    .eq("vendor_id", vendor.id)
    .order("created_at", { ascending: false });

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
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="outline">View store</Button>
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
          Your vendor account is pending admin approval. You will be able to
          list products once approved.
        </div>
      )}

      {vendor.status === "SUSPENDED" && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-900 text-sm">
          Your vendor account is suspended. Contact support.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Your products</CardDescription>
            <CardTitle className="text-3xl">{productCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vendor slug</CardDescription>
            <CardTitle className="text-lg font-mono">{vendor.slug}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Products</h2>
        {!products || products.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No products yet.
              {vendor.status === "APPROVED" && (
                <div className="mt-4">
                  <Link href="/vendor/products/new">
                    <Button>Add your first product</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {products.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded bg-muted overflow-hidden shrink-0">
                    {p.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.sku} · ₦{Number(p.price).toLocaleString()} · Stock{" "}
                      {p.stock_quantity}
                    </p>
                  </div>
                  <span className="text-xs rounded-full px-2 py-0.5 bg-muted">
                    {p.status}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
