"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    price: "",
    compareAtPrice: "",
    stockQuantity: "0",
    shortDescription: "",
    description: "",
    imageUrl: "",
    status: "ACTIVE" as "ACTIVE" | "DRAFT" | "ARCHIVED" | "OUT_OF_STOCK",
    brand: "",
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (fetchError || !data) {
        setError(fetchError?.message || "Product not found");
        setLoading(false);
        return;
      }

      setForm({
        name: data.name || "",
        sku: data.sku || "",
        price: String(data.price ?? ""),
        compareAtPrice: data.compare_at_price != null ? String(data.compare_at_price) : "",
        stockQuantity: String(data.stock_quantity ?? 0),
        shortDescription: data.short_description || "",
        description: data.description || "",
        imageUrl: Array.isArray(data.images) && data.images[0] ? data.images[0] : "",
        status: data.status || "ACTIVE",
        brand: data.brand || "",
      });
      setLoading(false);
    }

    load();
  }, [productId]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();

    try {
      const slug = slugify(form.name);
      const images = form.imageUrl.trim() ? [form.imageUrl.trim()] : [];

      const { error: updateError } = await supabase
        .from("products")
        .update({
          name: form.name,
          slug,
          sku: form.sku,
          price: Number(form.price),
          compare_at_price: form.compareAtPrice
            ? Number(form.compareAtPrice)
            : null,
          stock_quantity: Number(form.stockQuantity) || 0,
          short_description: form.shortDescription || null,
          description: form.description || null,
          brand: form.brand || null,
          status: form.status,
          images,
        })
        .eq("id", productId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading product...
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
          <p className="text-muted-foreground mt-1">
            Update product details
          </p>
        </div>
        <Link href="/admin/products">
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Wireless Headphones"
              />
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
                  placeholder="PROD-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  name="brand"
                  value={form.brand}
                  onChange={handleChange}
                  placeholder="Brand name"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₦) *</Label>
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
                <Label htmlFor="compareAtPrice">Compare at Price</Label>
                <Input
                  id="compareAtPrice"
                  name="compareAtPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.compareAtPrice}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stockQuantity">Stock *</Label>
                <Input
                  id="stockQuantity"
                  name="stockQuantity"
                  type="number"
                  min="0"
                  value={form.stockQuantity}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                name="imageUrl"
                type="url"
                value={form.imageUrl}
                onChange={handleChange}
                placeholder="https://images.unsplash.com/..."
              />
              <p className="text-xs text-muted-foreground">
                Paste a direct image link (Unsplash, Cloudinary, etc.)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDescription">Short Description</Label>
              <Input
                id="shortDescription"
                name="shortDescription"
                value={form.shortDescription}
                onChange={handleChange}
                placeholder="One-line summary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Full Description</Label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Detailed product description..."
              />
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
                <option value="ACTIVE">Active (visible in store)</option>
                <option value="DRAFT">Draft (hidden)</option>
                <option value="ARCHIVED">Archived</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>

            <div className="pt-4 flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Link href="/admin/products">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
