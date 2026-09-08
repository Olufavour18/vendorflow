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

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/account");
  }

  const params = await searchParams;
  const orderSuccess = params.order === "success";

  // Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, role, created_at")
    .eq("id", user.id)
    .single();

  // Orders
  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, order_number, total_amount, order_status, payment_status, created_at, customer_name"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const displayName =
    profile?.full_name || user.user_metadata?.full_name || user.email || "there";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Success banner */}
      {orderSuccess && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800">
          <p className="font-medium">Order placed successfully! 🎉</p>
          <p className="text-sm mt-1">
            You can track it below. We will notify you when payment is confirmed.
          </p>
        </div>
      )}

      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {displayName.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your orders and account details
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Your Profile</CardTitle>
            <CardDescription>Basic account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Full name</p>
              <p className="font-medium">{profile?.full_name || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium break-all">{user.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">{profile?.phone || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Role</p>
              <p className="font-medium capitalize">{profile?.role || "customer"}</p>
            </div>
            <div className="pt-2">
              <Link href="/products">
                <Button variant="outline" size="sm" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Orders */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Your Orders</CardTitle>
            <CardDescription>
              {orders && orders.length > 0
                ? `${orders.length} recent order${orders.length > 1 ? "s" : ""}`
                : "No orders yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!orders || orders.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p className="mb-4">You have not placed any orders yet.</p>
                <Link href="/products">
                  <Button>Browse Products</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("en-NG", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold">
                          ₦{Number(order.total_amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {order.order_status.replace(/_/g, " ").toLowerCase()}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          order.payment_status === "SUCCESS"
                            ? "bg-green-100 text-green-800"
                            : order.payment_status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {order.payment_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sign out helper */}
      <div className="mt-10 text-center">
        <form action="/auth/signout" method="post">
          {/* Simple client-side sign out will be better; for now link to login */}
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">
              Switch account
            </Button>
          </Link>
        </form>
      </div>
    </div>
  );
}
