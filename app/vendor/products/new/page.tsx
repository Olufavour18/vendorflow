"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase-errors";
import {
  slugify,
  salePrice,
  CONDITION_OPTIONS,
  PRODUCT_STATUS_OPTIONS,
} from "@/lib/product-utils";
import { ProductImageUpload } from "@/components/admin/product-image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Category = { id: string; name: string; parent_id: string | null };

type VariantForm = {
  name: string;
  brand: string;
  size: string;
  unit: string;
  sku: string;
  price: string;
  discount_percent: string;
  stock_quantity: string;
  low_stock_threshold: string;
  expires_at: string;
  condition: string;
};

const emptyVariant = (): VariantForm => ({
  name: "",
  brand: "",
  size: "",
  unit: "",
  sku: "",
  price: "",
  discount_percent: "",
  stock_quantity: "0",
  low_stock_threshold: "5",
  expires_at: "",
  condition: "",
});

export default function VendorNewProductPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    category_id: "",
    brand: "",
    unit: "",
    price: "",
    discount_percent: "",
    stock_quantity: "10",
    low_stock_threshold: "5",
    short_description: "",
    description: "",
    imageUrl: "",
    status: "ACTIVE",
    condition: "",
    expires_at: "",
  });
  const [variants, setVariants] = useState<VariantForm[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login?redirect=/vendor/products/new");
        return;
      }
      const { data: vendor } = await supabase
        .from("vendors")
        .select("id, status")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!vendor || vendor.status !== "APPROVED") {
        setError("Only approved vendors can add products.");
        setLoading(false);
        return;
      }
      setVendorId(vendor.id);
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name, parent_id")
        .eq("is_active", true)
        .order("sort_order");
      setCategories((cats as Category[]) || []);
      setLoading(false);
    }
    load();
  }, [router]);

  const parents = categories.filter((c) => !c.parent_id);
  const childrenOf = (parentId: string) =>
    categories.filter((c) => c.parent_id === parentId);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const updateVariant = (
    index: number,
    field: keyof VariantForm,
    value: string
  ) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) return;
    setSaving(true);
    setError(null);

    const price = Number(form.price);
    const discount = form.discount_percent
      ? Number(form.discount_percent)
      : null;
    if (Number.isNaN(price) || price < 0) {
      setError("Price must be 0 or greater.");
      setSaving(false);
      return;
    }
    if (discount != null && (discount < 0 || discount > 100)) {
      setError("Discount must be between 0 and 100%.");
      setSaving(false);
      return;
    }
    if (!form.category_id) {
      setError("Please select a category.");
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const slug = slugify(form.name) + "-" + Date.now().toString().slice(-6);
    const images = form.imageUrl.trim() ? [form.imageUrl.trim()] : [];

    const { data: product, error: insertError } = await supabase
      .from("products")
      .insert({
        name: form.name,
        slug,
        sku: form.sku,
        category_id: form.category_id,
        brand: form.brand || null,
        unit: form.unit || null,
        price,
        discount_percent: discount,
        compare_at_price: discount && discount > 0 ? price : null,
        stock_quantity: Number(form.stock_quantity) || 0,
        low_stock_threshold: Number(form.low_stock_threshold) || 5,
        short_description: form.short_description || null,
        description: form.description || null,
        status: form.status,
        condition: form.condition || null,
        expires_at: form.expires_at || null,
        images,
        vendor_id: vendorId,
        is_featured: false,
      })
      .select("id")
      .single();

    if (insertError || !product) {
      setError(formatSupabaseError(insertError));
      setSaving(false);
      return;
    }

    if (variants.length > 0) {
      const rows = variants.map((v, i) => {
        const vp = Number(v.price);
        const vd = v.discount_percent ? Number(v.discount_percent) : null;
        return {
          product_id: product.id,
          name: v.name || `${form.name} variant ${i + 1}`,
          brand: v.brand || form.brand || null,
          size: v.size || null,
          unit: v.unit || form.unit || null,
          sku: v.sku || `${form.sku}-V${i + 1}`,
          price: Number.isNaN(vp) ? 0 : vp,
          discount_percent: vd,
          compare_at_price: vd && vd > 0 ? vp : null,
          stock_quantity: Number(v.stock_quantity) || 0,
          low_stock_threshold: Number(v.low_stock_threshold) || 5,
          expires_at: v.expires_at || null,
          condition: v.condition || null,
          is_available: true,
          sort_order: i,
        };
      });
      const { error: vErr } = await supabase
        .from("product_variants")
        .insert(rows);
      if (vErr) {
        setError(
          formatSupabaseError(
            vErr,
            "Product saved but variants failed. You can edit the product to add them."
          )
        );
        setSaving(false);
        router.push(`/vendor/products/${product.id}/edit`);
        return;
      }
    }

    router.push("/vendor/products");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const previewSale = salePrice(
    Number(form.price) || 0,
    form.discount_percent ? Number(form.discount_percent) : null
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Add product</h1>
        <Link href="/vendor/products">
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      {vendorId && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Bread, Rice, Soft Drink"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category_id">Category *</Label>
                <select
                  id="category_id"
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select category</option>
                  {parents.map((p) => (
                    <optgroup key={p.id} label={p.name}>
                      <option value={p.id}>{p.name} (all)</option>
                      {childrenOf(p.id).map((c) => (
                        <option key={c.id} value={c.id}>
                          {p.name} → {c.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU / product code *</Label>
                  <Input
                    id="sku"
                    name="sku"
                    value={form.sku}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    name="brand"
                    value={form.brand}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Base price (₦) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount_percent">Discount %</Label>
                  <Input
                    id="discount_percent"
                    name="discount_percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.discount_percent}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sale price</Label>
                  <p className="h-10 flex items-center font-semibold">
                    ₦{previewSale.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Stock quantity *</Label>
                  <Input
                    id="stock_quantity"
                    name="stock_quantity"
                    type="number"
                    min="0"
                    value={form.stock_quantity}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="low_stock_threshold">Low stock at</Label>
                  <Input
                    id="low_stock_threshold"
                    name="low_stock_threshold"
                    type="number"
                    min="0"
                    value={form.low_stock_threshold}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    placeholder="kg, bag, piece…"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expires_at">Expiry / best-before</Label>
                  <Input
                    id="expires_at"
                    name="expires_at"
                    type="date"
                    value={form.expires_at}
                    onChange={handleChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty if not applicable.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition / quality</Label>
                  <select
                    id="condition"
                    name="condition"
                    value={form.condition}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {CONDITION_OPTIONS.map((o) => (
                      <option key={o.value || "x"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {PRODUCT_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <ProductImageUpload
                value={form.imageUrl}
                onChange={(url) =>
                  setForm((prev) => ({ ...prev, imageUrl: url }))
                }
              />
              <div className="space-y-2">
                <Label htmlFor="short_description">Short description</Label>
                <Input
                  id="short_description"
                  name="short_description"
                  value={form.short_description}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Full description</Label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Variants (optional)</CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setVariants((v) => [...v, emptyVariant()])}
              >
                Add variant
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Different brands, sizes, or packs. Skip if one price/stock is
                enough.
              </p>
              {variants.map((v, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3 relative">
                  <button
                    type="button"
                    className="absolute top-2 right-2 text-xs text-destructive"
                    onClick={() =>
                      setVariants((list) => list.filter((_, j) => j !== i))
                    }
                  >
                    Remove
                  </button>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Variant name</Label>
                      <Input
                        value={v.name}
                        onChange={(e) =>
                          updateVariant(i, "name", e.target.value)
                        }
                        placeholder="Agege Bread — Large"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>SKU</Label>
                      <Input
                        value={v.sku}
                        onChange={(e) =>
                          updateVariant(i, "sku", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Brand</Label>
                      <Input
                        value={v.brand}
                        onChange={(e) =>
                          updateVariant(i, "brand", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Size</Label>
                      <Input
                        value={v.size}
                        onChange={(e) =>
                          updateVariant(i, "size", e.target.value)
                        }
                        placeholder="Large / 5kg / 35cl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Price ₦</Label>
                      <Input
                        type="number"
                        min="0"
                        value={v.price}
                        onChange={(e) =>
                          updateVariant(i, "price", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Discount %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={v.discount_percent}
                        onChange={(e) =>
                          updateVariant(i, "discount_percent", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Stock</Label>
                      <Input
                        type="number"
                        min="0"
                        value={v.stock_quantity}
                        onChange={(e) =>
                          updateVariant(i, "stock_quantity", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Expiry</Label>
                      <Input
                        type="date"
                        value={v.expires_at}
                        onChange={(e) =>
                          updateVariant(i, "expires_at", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save product"}
          </Button>
        </form>
      )}
    </div>
  );
}
