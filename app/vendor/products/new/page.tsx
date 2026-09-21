"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase-errors";
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

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function VendorNewProductPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    price: "",
    stockQuantity: "10",
    shortDescription: "",
    description: "",
    imageUrl: "",
    status: "DRAFT" as "ACTIVE" | "DRAFT",
  });

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
      setLoading(false);
    }
    load();
  }, [router]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const slug = slugify(form.name) + "-" + Date.now().toString().slice(-4);
    const images = form.imageUrl.trim() ? [form.imageUrl.trim()] : [];

    const { error: insertError } = await supabase.from("products").insert({
      name: form.name,
      slug,
      sku: form.sku,
      price: Number(form.price),
      stock_quantity: Number(form.stockQuantity) || 0,
      short_description: form.shortDescription || null,
      description: form.description || null,
      status: form.status,
      images,
      vendor_id: vendorId,
      is_featured: false,
    });

    if (insertError) {
      setError(formatSupabaseError(insertError));
      setSaving(false);
      return;
    }

    router.push("/vendor");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Add product</h1>
        <Link href="/vendor">
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      {vendorId && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Product details</CardTitle>
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

              <ProductImageUpload
                value={form.imageUrl}
                onChange={(url) =>
                  setForm((prev) => ({ ...prev, imageUrl: url }))
                }
              />

              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short description</Label>
                <Input
                  id="shortDescription"
                  name="shortDescription"
                  value={form.shortDescription}
                  onChange={handleChange}
                />
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                </select>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Create product"}
              </Button>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
