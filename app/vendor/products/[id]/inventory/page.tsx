"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase-errors";
import { isLowStock } from "@/lib/product-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Variant = {
  id: string;
  name: string;
  sku: string;
  stock_quantity: number;
  low_stock_threshold: number | null;
};

export default function VendorInventoryPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [name, setName] = useState("");
  const [stock, setStock] = useState(0);
  const [threshold, setThreshold] = useState(5);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [adjust, setAdjust] = useState("");
  const [variantAdjust, setVariantAdjust] = useState<Record<string, string>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data: product, error: pErr } = await supabase
      .from("products")
      .select(
        "id, name, stock_quantity, low_stock_threshold, vendor_id, vendors!inner(owner_id)"
      )
      .eq("id", productId)
      .single();

    if (pErr || !product) {
      setError(formatSupabaseError(pErr, "Product not found"));
      setLoading(false);
      return;
    }

    const owner = (product.vendors as { owner_id: string } | null)?.owner_id;
    if (owner !== user.id) {
      setError("You can only manage your own products.");
      setLoading(false);
      return;
    }

    setName(product.name);
    setStock(product.stock_quantity);
    setThreshold(product.low_stock_threshold ?? 5);

    const { data: vars } = await supabase
      .from("product_variants")
      .select("id, name, sku, stock_quantity, low_stock_threshold")
      .eq("product_id", productId)
      .order("sort_order");

    setVariants((vars as Variant[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const applyProductAdjust = async () => {
    const delta = Number(adjust);
    if (Number.isNaN(delta) || delta === 0) {
      setError("Enter a non-zero number (e.g. 30 to add, -5 to remove).");
      return;
    }
    const next = Math.max(0, stock + delta);
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: uErr } = await supabase
      .from("products")
      .update({ stock_quantity: next })
      .eq("id", productId);
    if (uErr) {
      setError(formatSupabaseError(uErr));
      setSaving(false);
      return;
    }
    setStock(next);
    setAdjust("");
    setSuccess(`Stock updated to ${next}`);
    setSaving(false);
  };

  const applyVariantAdjust = async (variantId: string) => {
    const delta = Number(variantAdjust[variantId] || 0);
    if (Number.isNaN(delta) || delta === 0) {
      setError("Enter a non-zero adjustment for the variant.");
      return;
    }
    const v = variants.find((x) => x.id === variantId);
    if (!v) return;
    const next = Math.max(0, v.stock_quantity + delta);
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: uErr } = await supabase
      .from("product_variants")
      .update({ stock_quantity: next })
      .eq("id", variantId);
    if (uErr) {
      setError(formatSupabaseError(uErr));
      setSaving(false);
      return;
    }
    setVariants((list) =>
      list.map((x) =>
        x.id === variantId ? { ...x, stock_quantity: next } : x
      )
    );
    setVariantAdjust((m) => ({ ...m, [variantId]: "" }));
    setSuccess(`${v.name}: stock now ${next}`);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">{name}</p>
        </div>
        <Link href="/vendor/products">
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-sm text-green-800 bg-green-50 rounded-md">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Product stock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-3xl font-bold">{stock}</p>
          {isLowStock(stock, threshold) && (
            <p className="text-sm text-yellow-700">Low stock (threshold {threshold})</p>
          )}
          {stock <= 0 && (
            <p className="text-sm text-destructive">Out of stock</p>
          )}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label>Adjust by</Label>
              <Input
                type="number"
                value={adjust}
                onChange={(e) => setAdjust(e.target.value)}
                placeholder="+30 or -5"
              />
            </div>
            <Button onClick={applyProductAdjust} disabled={saving}>
              Update
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Example: sold 5 → enter -5. Received 30 → enter 30.
          </p>
        </CardContent>
      </Card>

      {variants.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold">Variants</h2>
          {variants.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{v.name}</p>
                    <p className="text-xs text-muted-foreground">{v.sku}</p>
                  </div>
                  <p className="text-xl font-bold">{v.stock_quantity}</p>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label>Adjust by</Label>
                    <Input
                      type="number"
                      value={variantAdjust[v.id] || ""}
                      onChange={(e) =>
                        setVariantAdjust((m) => ({
                          ...m,
                          [v.id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => applyVariantAdjust(v.id)}
                    disabled={saving}
                  >
                    Update
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Link href={`/vendor/products/${productId}/edit`}>
        <Button variant="outline" className="w-full">
          Edit product details
        </Button>
      </Link>
    </div>
  );
}
