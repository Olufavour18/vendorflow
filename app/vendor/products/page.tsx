import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getExpiryStatus,
  expiryLabel,
  isLowStock,
  salePrice,
} from "@/lib/product-utils";

type SearchParams = Promise<{
  q?: string;
  category?: string;
  status?: string;
  stock?: string;
  expiry?: string;
}>;

export default async function VendorProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirect=/vendor/products");

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, business_name, status")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!vendor) redirect("/vendor/register");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .eq("is_active", true)
    .order("sort_order");

  let query = supabase
    .from("products")
    .select(
      `id, name, slug, sku, price, compare_at_price, discount_percent, stock_quantity,
       low_stock_threshold, status, images, expires_at, condition, category_id,
       brand, unit, created_at,
       categories ( id, name ),
       product_variants ( id, stock_quantity, is_available, expires_at, low_stock_threshold )`
    )
    .eq("vendor_id", vendor.id)
    .order("created_at", { ascending: false });

  if (params.status) {
    query = query.eq("status", params.status);
  }
  if (params.category) {
    query = query.eq("category_id", params.category);
  }
  if (params.q?.trim()) {
    query = query.or(
      `name.ilike.%${params.q.trim()}%,sku.ilike.%${params.q.trim()}%,brand.ilike.%${params.q.trim()}%`
    );
  }

  const { data: products } = await query;

  type Row = NonNullable<typeof products>[number];

  const filtered = (products || []).filter((p: Row) => {
    const variants = (p.product_variants as {
      stock_quantity: number;
      is_available: boolean;
      expires_at: string | null;
      low_stock_threshold: number | null;
    }[]) || [];

    const stock =
      variants.length > 0
        ? variants.reduce((s, v) => s + (v.stock_quantity || 0), 0)
        : p.stock_quantity;

    if (params.stock === "low") {
      const low =
        variants.length > 0
          ? variants.some((v) =>
              isLowStock(v.stock_quantity, v.low_stock_threshold)
            )
          : isLowStock(p.stock_quantity, p.low_stock_threshold);
      if (!low) return false;
    }
    if (params.stock === "out" && stock > 0) return false;
    if (params.stock === "in" && stock <= 0) return false;

    if (params.expiry === "near" || params.expiry === "expired") {
      const dates = [
        p.expires_at,
        ...variants.map((v) => v.expires_at),
      ].filter(Boolean) as string[];
      if (dates.length === 0) return false;
      const match = dates.some((d) => {
        const s = getExpiryStatus(d);
        return params.expiry === "near"
          ? s === "near_expiry"
          : s === "expired";
      });
      if (!match) return false;
    }

    return true;
  });

  function href(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = {
      q: params.q,
      category: params.category,
      status: params.status,
      stock: params.stock,
      expiry: params.expiry,
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) sp.set(k, v);
    });
    const s = sp.toString();
    return s ? `/vendor/products?${s}` : "/vendor/products";
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1">
            {filtered.length} product{filtered.length !== 1 ? "s" : ""}
            {vendor.status !== "APPROVED" && (
              <span className="text-yellow-700"> · Vendor not approved yet</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/vendor">
            <Button variant="outline">Dashboard</Button>
          </Link>
          {vendor.status === "APPROVED" && (
            <Link href="/vendor/products/new">
              <Button>Add product</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <form className="flex flex-col sm:flex-row flex-wrap gap-2">
        <input
          name="q"
          defaultValue={params.q || ""}
          placeholder="Search name, SKU, brand…"
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[200px]"
        />
        <select
          name="category"
          defaultValue={params.category || ""}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {(categories || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={params.status || ""}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="DRAFT">Draft</option>
          <option value="OUT_OF_STOCK">Out of stock</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select
          name="stock"
          defaultValue={params.stock || ""}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Any stock</option>
          <option value="in">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <select
          name="expiry"
          defaultValue={params.expiry || ""}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Any expiry</option>
          <option value="near">Near expiry</option>
          <option value="expired">Expired</option>
        </select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        <Link href="/vendor/products">
          <Button type="button" variant="ghost">
            Clear
          </Button>
        </Link>
      </form>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="mb-4">No products match.</p>
            {vendor.status === "APPROVED" && (
              <Link href="/vendor/products/new">
                <Button>Add product</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p: Row) => {
            const variants = (p.product_variants as {
              id: string;
              stock_quantity: number;
              expires_at: string | null;
              low_stock_threshold: number | null;
            }[]) || [];
            const stock =
              variants.length > 0
                ? variants.reduce((s, v) => s + v.stock_quantity, 0)
                : p.stock_quantity;
            const threshold = p.low_stock_threshold ?? 5;
            const low =
              variants.length > 0
                ? variants.some((v) =>
                    isLowStock(v.stock_quantity, v.low_stock_threshold)
                  )
                : isLowStock(stock, threshold);
            const expDates = [
              p.expires_at,
              ...variants.map((v) => v.expires_at),
            ].filter(Boolean) as string[];
            let expStatus = getExpiryStatus(null);
            for (const d of expDates) {
              const s = getExpiryStatus(d);
              if (s === "expired") {
                expStatus = "expired";
                break;
              }
              if (s === "near_expiry") expStatus = "near_expiry";
              else if (s === "fresh" && expStatus === "none") expStatus = "fresh";
            }
            const final = salePrice(
              Number(p.price),
              p.discount_percent,
              p.compare_at_price != null ? Number(p.compare_at_price) : null
            );
            const cat = p.categories as { name: string } | null;

            return (
              <Card key={p.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="w-16 h-16 rounded bg-muted overflow-hidden shrink-0">
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
                      {cat?.name || "Uncategorized"}
                      {p.brand ? ` · ${p.brand}` : ""}
                      {variants.length > 0
                        ? ` · ${variants.length} variant${variants.length > 1 ? "s" : ""}`
                        : ""}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      <span className="rounded-full px-2 py-0.5 bg-muted">
                        {p.status}
                      </span>
                      {low && (
                        <span className="rounded-full px-2 py-0.5 bg-yellow-100 text-yellow-800">
                          Low stock
                        </span>
                      )}
                      {stock <= 0 && (
                        <span className="rounded-full px-2 py-0.5 bg-red-100 text-red-800">
                          Out of stock
                        </span>
                      )}
                      {expiryLabel(expStatus) && (
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            expStatus === "expired"
                              ? "bg-red-100 text-red-800"
                              : expStatus === "near_expiry"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {expiryLabel(expStatus)}
                        </span>
                      )}
                      {p.discount_percent != null && p.discount_percent > 0 && (
                        <span className="rounded-full px-2 py-0.5 bg-primary/10 text-primary">
                          {p.discount_percent}% off
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className="font-semibold">
                      ₦{final.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Stock: {stock}
                    </p>
                    <div className="flex gap-2 justify-end pt-1">
                      <Link href={`/vendor/products/${p.id}/edit`}>
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                      </Link>
                      <Link href={`/vendor/products/${p.id}/inventory`}>
                        <Button size="sm" variant="secondary">
                          Inventory
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Keep query params on GET form */}
      <p className="text-xs text-muted-foreground">
        Filters use the form above (GET).{" "}
        <Link href={href({})} className="underline">
          Reset view
        </Link>
      </p>
    </div>
  );
}
