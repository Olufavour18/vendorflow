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

  await supabase.from("cart_items").delete().eq("cart_id", cart.id);

  if (items.length > 0) {
    const rows = items.map((item) => ({
      cart_id: cart!.id,
      product_id: item.id,
      variant_id: item.variantId || null,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase.from("cart_items").insert(rows);
    if (itemsError) {
      return { cartId: cart.id, error: itemsError.message };
    }
  }

  return { cartId: cart.id };
}

/** Load cart items from DB and map to CartItem shape (product + variant join). */
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
      `
      quantity,
      product_id,
      variant_id,
      products (
        id, name, slug, price, sku, images, stock_quantity, discount_percent
      ),
      product_variants (
        id, name, sku, price, discount_percent, stock_quantity, size, unit, brand
      )
    `
    )
    .eq("cart_id", cart.id);

  if (error) {
    return { items: [], error: error.message };
  }

  const items: CartItem[] = (rows || [])
    .map(
      (row: {
        quantity: number;
        product_id: string;
        variant_id: string | null;
        products: {
          id: string;
          name: string;
          slug: string;
          price: number;
          sku?: string;
          images?: string[];
          stock_quantity?: number;
          discount_percent?: number | null;
        } | null;
        product_variants: {
          id: string;
          name: string;
          sku: string;
          price: number;
          discount_percent?: number | null;
          stock_quantity?: number;
          size?: string | null;
          unit?: string | null;
          brand?: string | null;
        } | null;
      }) => {
        const p = row.products;
        if (!p) return null;

        const v = row.product_variants;
        const price = v ? Number(v.price) : Number(p.price);
        const discount = v?.discount_percent ?? p.discount_percent;
        const finalPrice =
          discount != null && discount > 0
            ? Math.round(price * (1 - discount / 100) * 100) / 100
            : price;

        const variantLabel = v
          ? [v.size, v.unit, v.brand].filter(Boolean).join(" · ") || v.name
          : undefined;

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: finalPrice,
          sku: v?.sku ?? p.sku,
          image: Array.isArray(p.images) ? p.images[0] : undefined,
          quantity: row.quantity,
          variantId: v?.id ?? row.variant_id ?? undefined,
          variantLabel,
          variantSku: v?.sku,
          maxStock: v?.stock_quantity ?? p.stock_quantity,
        } as CartItem;
      }
    )
    .filter(Boolean) as CartItem[];

  return { items };
}
