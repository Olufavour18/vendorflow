"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase-errors";
import {
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

export default function VendorEditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

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
    stock_quantity: "0",
    low_stock_threshold: "5",
    short_description: "",
    description: "",
    imageUrl: "",
    status: "ACTIVE",
    condition: "",
    expires_at: "",
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: cats } = await supabase
        .from("categories")
        .select("id, name, parent_id")
        .eq("is_active", true)
        .order("sort_order");
      setCategories((cats as Category[]) || []);

      const { data: product, error: pErr } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (pErr || !product) {
        setError(formatSupabaseError(pErr, "Product not found"));
        setLoading(false);
        return;
      }

      setForm({
        name: product.name || "",
        sku: product.sku || "",
        category_id: product.category_id || "",
        brand: product.brand || "",
        unit: product.unit || "",
        price: String(product.price ?? ""),
        discount_percent:
          product.discount_percent != null
            ? String(product.discount_percent)
            : "",
        stock_quantity: String(product.stock_quantity ?? 0),
        low_stock_threshold: String(product.low_stock_threshold ?? 5),
        short_description: product.short_description || "",
        description: product.description || "",
        imageUrl:
          Array.isArray(product.images) && product.images[0]
            ? product.images[0]
            : "",
        status: product.status || "ACTIVE",
        condition: product.condition || "",
        expires_at: product.expires_at
          ? String(product.expires_at).slice(0, 10)
          : "",
      });
      setLoading(false);
    }
    load();
  }, [productId, router]);

  const parents = categories.filter((c) => !c.parent_id);
  const childrenOf = (parentId: string) =>
    categories.filter((c) => c.parent_id === parentId);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const price = Number(form.price);
    const discount = form.discount_percent
      ? Number(form.discount_percent)
      : null;
    if (Number.isNaN(price) || price < 0) {
      setError("Invalid price");
      setSaving(false);
      return;
    }
    if (discount != null && (discount < 0 || discount > 100)) {
      setError("Discount must be 0–100%");
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const images = form.imageUrl.trim() ? [form.imageUrl.trim()] : [];

    const { data: rows, error: uErr } = await supabase
      .from("products")
      .update({
        name: form.name,
        sku: form.sku,
        category_id: form.category_id || null,
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
      })
      .eq("id", productId)
      .select("id");

    if (uErr) {
      setError(formatSupabaseError(uErr));
      setSaving(false);
      return;
    }
    if (!rows?.length) {
      setError(
        "Update blocked (RLS). Confirm this product belongs to your vendor."
      );
      setSaving(false);
      return;
    }

    router.push("/vendor/products");
    router.refresh();
  };

  const handleDeactivate = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("products")
      .update({ status: "INACTIVE" })
      .eq("id", productId);
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

  const preview = salePrice(
    Number(form.price) || 0,
    form.discount_percent ? Number(form.discount_percent) : null
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-3xl font-bold">Edit product</h1>
        <div className="flex gap-2">
          <Link href={`/vendor/products/${productId}/inventory`}>
            <Button variant="secondary">Inventory</Button>
          </Link>
          <Link href="/vendor/products">
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category_id">Category</Label>
              <select
                id="category_id"
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {parents.map((p) => (
                  <optgroup key={p.id} label={p.name}>
                    <option value={p.id}>{p.name}</option>
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
                <Label htmlFor="sku">SKU *</Label>
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
                <Label htmlFor="price">Price ₦ *</Label>
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
                  value={form.discount_percent}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label>Sale price</Label>
                <p className="h-10 flex items-center font-semibold">
                  ₦{preview.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock_quantity">Stock</Label>
                <Input
                  id="stock_quantity"
                  name="stock_quantity"
                  type="number"
                  min="0"
                  value={form.stock_quantity}
                  onChange={handleChange}
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
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expires_at">Expiry</Label>
                <Input
                  id="expires_at"
                  name="expires_at"
                  type="date"
                  value={form.expires_at}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
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
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={handleDeactivate}
              >
                Deactivate
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
