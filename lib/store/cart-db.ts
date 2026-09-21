import { createClient } from "@/lib/supabase/client";
import type { CartItem } from "@/lib/store/cart";

/**
 * Sync local Zustand cart → database cart for the current user.
 * Creates cart + cart_items rows. Safe to call after login or before checkout.
 */
export async function syncCartToDatabase(items: CartItem[]): Promise<{
  cartId: string | null;
  error?: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { cartId: null, error: "Not logged in" };
  }

  // Find or create cart
  let { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!cart) {
    const { data: created, error } = await supabase
      .from("carts")
      .insert({ user_id: user.id })
      .select("id")
      .single();

    if (error || !created) {
      return { cartId: null, error: error?.message || "Failed to create cart" };
    }
    cart = created;
  }

  // Replace items
  await supabase.from("cart_items").delete().eq("cart_id", cart.id);

  if (items.length > 0) {
    const rows = items.map((item) => ({
      cart_id: cart!.id,
      product_id: item.id,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase.from("cart_items").insert(rows);
    if (itemsError) {
      return { cartId: cart.id, error: itemsError.message };
    }
  }

  return { cartId: cart.id };
}

/** Load cart items from DB and map to CartItem shape (needs product join). */
export async function loadCartFromDatabase(): Promise<{
  items: CartItem[];
  error?: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { items: [] };
  }

  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!cart) {
    return { items: [] };
  }

  const { data: rows, error } = await supabase
    .from("cart_items")
    .select(
      "quantity, product_id, products(id, name, slug, price, sku, images, stock_quantity)"
    )
    .eq("cart_id", cart.id);

  if (error) {
    return { items: [], error: error.message };
  }

  const items: CartItem[] = (rows || [])
    .map((row: {
      quantity: number;
      products: {
        id: string;
        name: string;
        slug: string;
        price: number;
        sku?: string;
        images?: string[];
      } | null;
    }) => {
      const p = row.products;
      if (!p) return null;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        sku: p.sku,
        image: Array.isArray(p.images) ? p.images[0] : undefined,
        quantity: row.quantity,
      } as CartItem;
    })
    .filter(Boolean) as CartItem[];

  return { items };
}
