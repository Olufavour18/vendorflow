"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/store/cart";
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

type SavedAddress = {
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

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "PAYSTACK" | "BANK_TRANSFER"
  >("PAYSTACK");
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new">(
    "new"
  );
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    landmark: "",
  });

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAddressesLoaded(true);
        return;
      }
      const { data } = await supabase
        .from("addresses")
        .select(
          "id, label, full_name, phone, address_line1, address_line2, city, state, landmark, is_default"
        )
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });
      const list = (data as SavedAddress[]) || [];
      setAddresses(list);
      const def = list.find((a) => a.is_default) || list[0];
      if (def) {
        setSelectedAddressId(def.id);
        setForm({
          fullName: def.full_name,
          email: "",
          phone: def.phone,
          addressLine1: def.address_line1,
          addressLine2: def.address_line2 || "",
          city: def.city,
          state: def.state,
          landmark: def.landmark || "",
        });
      }
      setAddressesLoaded(true);
    };
    load();
  }, []);

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Checkout</h1>
        <p className="text-muted-foreground mb-8">Your cart is empty.</p>
        <Link href="/products">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const selectAddress = (id: string | "new") => {
    setSelectedAddressId(id);
    if (id === "new") {
      setForm((prev) => ({
        ...prev,
        fullName: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        landmark: "",
      }));
      return;
    }
    const a = addresses.find((x) => x.id === id);
    if (!a) return;
    setForm((prev) => ({
      ...prev,
      fullName: a.full_name,
      phone: a.phone,
      addressLine1: a.address_line1,
      addressLine2: a.address_line2 || "",
      city: a.city,
      state: a.state,
      landmark: a.landmark || "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (paymentMethod === "PAYSTACK" && !form.email) {
      setError("Email is required for Paystack payment.");
      setLoading(false);
      return;
    }
    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (selectedAddressId !== "new" && user) {
        const { data: owned } = await supabase
          .from("addresses")
          .select("id")
          .eq("id", selectedAddressId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!owned) {
          throw new Error("Selected address is invalid or not yours.");
        }
      }

      let orderNumber: string;
      const { data: rpcNumber, error: rpcError } = await supabase.rpc(
        "generate_order_number"
      );
      if (!rpcError && rpcNumber) {
        orderNumber = rpcNumber as string;
      } else {
        orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
      }

      const subtotal = totalPrice();
      const totalAmount = subtotal;

      const shippingAddress = {
        full_name: form.fullName,
        phone: form.phone,
        email: form.email || null,
        address_line1: form.addressLine1,
        address_line2: form.addressLine2 || null,
        city: form.city,
        state: form.state,
        landmark: form.landmark || null,
        address_id:
          selectedAddressId !== "new" ? selectedAddressId : null,
        label:
          selectedAddressId !== "new"
            ? addresses.find((a) => a.id === selectedAddressId)?.label || null
            : null,
      };

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: user?.id || null,
          customer_name: form.fullName,
          customer_email: form.email || null,
          customer_phone: form.phone,
          subtotal,
          shipping_fee: 0,
          discount_amount: 0,
          total_amount: totalAmount,
          order_status: "PENDING_PAYMENT",
          payment_status: "PENDING",
          shipping_address: shippingAddress,
        })
        .select("id, order_number")
        .single();

      if (orderError || !order) {
        throw new Error(orderError?.message || "Failed to create order");
      }

      const productIds = [...new Set(items.map((i) => i.id))];
      const { data: productRows } = await supabase
        .from("products")
        .select("id, vendor_id")
        .in("id", productIds);
      const vendorByProduct = new Map<string, string | null>();
      for (const p of productRows || []) {
        vendorByProduct.set(p.id, p.vendor_id);
      }

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        product_sku: item.sku || "N/A",
        product_image: item.image || null,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        variant_id: item.variantId || null,
        variant_label: item.variantLabel || null,
        variant_sku: item.variantSku || null,
        vendor_id: vendorByProduct.get(item.id) || null,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);
      if (itemsError) {
        throw new Error(itemsError.message || "Failed to save order items");
      }

      await supabase.from("payments").insert({
        order_id: order.id,
        amount: totalAmount,
        currency: "NGN",
        payment_method: paymentMethod,
        status: "PENDING",
      });

      if (paymentMethod === "PAYSTACK") {
        const payRes = await fetch("/api/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            email: form.email,
            amount: totalAmount,
          }),
        });
        const payData = await payRes.json();
        if (!payRes.ok || !payData.authorization_url) {
          throw new Error(payData.error || "Failed to start Paystack payment");
        }
        clearCart();
        window.location.href = payData.authorization_url;
        return;
      }

      clearCart();
      router.push("/account?order=success");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!addressesLoaded ? (
                  <p className="text-sm text-muted-foreground">Loading addresses…</p>
                ) : addresses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No saved addresses. Enter delivery details below.{" "}
                    <Link href="/account" className="underline text-primary">
                      Manage addresses
                    </Link>
                  </p>
                ) : (
                  <>
                    {addresses.map((a) => (
                      <label
                        key={a.id}
                        className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                          selectedAddressId === a.id
                            ? "border-primary bg-primary/5"
                            : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="deliveryAddress"
                          className="mt-1"
                          checked={selectedAddressId === a.id}
                          onChange={() => selectAddress(a.id)}
                        />
                        <div className="text-sm">
                          <p className="font-medium">
                            {a.label || "Address"}
                            {a.is_default ? " (Default)" : ""}
                          </p>
                          <p className="text-muted-foreground">
                            {a.full_name} · {a.phone}
                          </p>
                          <p className="text-muted-foreground">
                            {a.address_line1}
                            {a.address_line2 ? `, ${a.address_line2}` : ""}
                          </p>
                          <p className="text-muted-foreground">
                            {a.city}, {a.state}
                          </p>
                        </div>
                      </label>
                    ))}
                    <label
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                        selectedAddressId === "new"
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliveryAddress"
                        checked={selectedAddressId === "new"}
                        onChange={() => selectAddress("new")}
                      />
                      <span className="text-sm font-medium">
                        + Use a different address
                      </span>
                    </label>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact &amp; Address Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email {paymentMethod === "PAYSTACK" ? "*" : ""}
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required={paymentMethod === "PAYSTACK"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressLine1">Address Line 1 *</Label>
                  <Input
                    id="addressLine1"
                    name="addressLine1"
                    value={form.addressLine1}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    name="addressLine2"
                    value={form.addressLine2}
                    onChange={handleChange}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
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
                <div className="space-y-2">
                  <Label htmlFor="landmark">Landmark</Label>
                  <Input
                    id="landmark"
                    name="landmark"
                    value={form.landmark}
                    onChange={handleChange}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <input
                    type="radio"
                    name="payment"
                    value="PAYSTACK"
                    checked={paymentMethod === "PAYSTACK"}
                    onChange={() => setPaymentMethod("PAYSTACK")}
                  />
                  <div>
                    <p className="font-medium">Pay Online (Paystack)</p>
                    <p className="text-sm text-muted-foreground">
                      Card, Bank Transfer, USSD
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <input
                    type="radio"
                    name="payment"
                    value="BANK_TRANSFER"
                    checked={paymentMethod === "BANK_TRANSFER"}
                    onChange={() => setPaymentMethod("BANK_TRANSFER")}
                  />
                  <div>
                    <p className="font-medium">Bank Transfer</p>
                    <p className="text-sm text-muted-foreground">
                      Manual transfer + upload proof later
                    </p>
                  </div>
                </label>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => {
                  const key = `${item.id}:${item.variantId || ""}`;
                  return (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="line-clamp-1">
                        {item.name}
                        {item.variantLabel ? ` (${item.variantLabel})` : ""} ×{" "}
                        {item.quantity}
                      </span>
                      <span>
                        ₦{(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
                <div className="border-t pt-4 flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>₦{totalPrice().toLocaleString()}</span>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading
                    ? paymentMethod === "PAYSTACK"
                      ? "Redirecting to Paystack..."
                      : "Placing Order..."
                    : paymentMethod === "PAYSTACK"
                      ? "Pay with Paystack"
                      : "Place Order"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
