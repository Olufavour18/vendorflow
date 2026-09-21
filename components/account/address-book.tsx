"use client";

import { useEffect, useState } from "react";
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

type Address = {
  id: string;
  label: string | null;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  landmark: string | null;
  is_default: boolean;
};

const emptyForm = {
  label: "Home",
  full_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  landmark: "",
  is_default: false,
};

export function AddressBook() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false });

    if (fetchError) {
      setError(formatSupabaseError(fetchError));
    } else {
      setAddresses((data as Address[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Please sign in.");
      setSaving(false);
      return;
    }

    if (form.is_default) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);
    }

    const { error: insertError } = await supabase.from("addresses").insert({
      user_id: user.id,
      label: form.label || null,
      full_name: form.full_name,
      phone: form.phone,
      address_line1: form.address_line1,
      address_line2: form.address_line2 || null,
      city: form.city,
      state: form.state,
      landmark: form.landmark || null,
      is_default: form.is_default,
    });

    if (insertError) {
      setError(formatSupabaseError(insertError));
      setSaving(false);
      return;
    }

    setForm(emptyForm);
    setShowForm(false);
    setSaving(false);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this address?")) return;
    const supabase = createClient();
    const { error: delError } = await supabase
      .from("addresses")
      .delete()
      .eq("id", id);

    if (delError) {
      setError(formatSupabaseError(delError));
      return;
    }
    await load();
  };

  const setDefault = async (id: string) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);

    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    await load();
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading addresses…</p>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Address Book</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancel" : "Add Address"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {showForm && (
          <form onSubmit={handleSave} className="space-y-3 border rounded-lg p-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  name="label"
                  value={form.label}
                  onChange={handleChange}
                  placeholder="Home / Work"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="full_name">Full name *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="address_line1">Address line 1 *</Label>
              <Input
                id="address_line1"
                name="address_line1"
                value={form.address_line1}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="address_line2">Address line 2</Label>
              <Input
                id="address_line2"
                name="address_line2"
                value={form.address_line2}
                onChange={handleChange}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="landmark">Landmark</Label>
              <Input
                id="landmark"
                name="landmark"
                value={form.landmark}
                onChange={handleChange}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_default"
                checked={form.is_default}
                onChange={handleChange}
              />
              Set as default
            </label>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Address"}
            </Button>
          </form>
        )}

        {addresses.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">
            No saved addresses yet. Add one for faster checkout.
          </p>
        )}

        <div className="space-y-3">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="border rounded-lg p-3 text-sm space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">
                  {addr.label || "Address"}
                  {addr.is_default && (
                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Default
                    </span>
                  )}
                </p>
                <div className="flex gap-2">
                  {!addr.is_default && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setDefault(addr.id)}
                    >
                      Make default
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
                    onClick={() => handleDelete(addr.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p>{addr.full_name} · {addr.phone}</p>
              <p className="text-muted-foreground">
                {addr.address_line1}
                {addr.address_line2 ? `, ${addr.address_line2}` : ""}
                {`, ${addr.city}, ${addr.state}`}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
