"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase-errors";
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

export default function VendorRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    business_name: "",
    description: "",
    email: "",
    phone: "",
    city: "",
    state: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please sign in before registering as a vendor.");
      setLoading(false);
      return;
    }

    const slug = slugify(form.business_name) + "-" + Date.now().toString().slice(-4);

    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .insert({
        owner_id: user.id,
        business_name: form.business_name,
        slug,
        description: form.description || null,
        email: form.email || user.email,
        phone: form.phone || null,
        city: form.city || null,
        state: form.state || null,
        status: "PENDING",
      })
      .select("id")
      .single();

    if (vendorError || !vendor) {
      setError(
        formatSupabaseError(
          vendorError,
          "Could not create vendor. You may already have one."
        )
      );
      setLoading(false);
      return;
    }

    await supabase.from("vendor_profiles").insert({
      vendor_id: vendor.id,
    });

    // Promote role to vendor if still customer
    await supabase
      .from("profiles")
      .update({ role: "vendor" })
      .eq("id", user.id)
      .eq("role", "customer");

    router.push("/vendor");
    router.refresh();
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Become a Vendor</CardTitle>
          <p className="text-sm text-muted-foreground">
            Register your business. An admin will approve you before products go
            live.
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business name *</Label>
              <Input
                id="business_name"
                name="business_name"
                value={form.business_name}
                onChange={handleChange}
                required
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
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Business email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Submitting…" : "Submit for approval"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Already a vendor?{" "}
              <Link href="/vendor" className="underline">
                Go to dashboard
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
