import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Decrement product and variant stock for a paid order.
 * Safe to call only once per order (caller should check payment_status).
 */
export async function decrementStockForOrder(
  admin: SupabaseClient,
  orderId: string
): Promise<void> {
  const { data: items } = await admin
    .from("order_items")
    .select("product_id, variant_id, quantity")
    .eq("order_id", orderId);

  if (!items?.length) return;

  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    if (qty <= 0) continue;

    if (item.variant_id) {
      const { data: variant } = await admin
        .from("product_variants")
        .select("id, stock_quantity")
        .eq("id", item.variant_id)
        .maybeSingle();

      if (variant) {
        const next = Math.max(0, (variant.stock_quantity ?? 0) - qty);
        await admin
          .from("product_variants")
          .update({ stock_quantity: next })
          .eq("id", variant.id);
      }
    }

    if (item.product_id) {
      const { data: product } = await admin
        .from("products")
        .select("id, stock_quantity")
        .eq("id", item.product_id)
        .maybeSingle();

      if (product) {
        const next = Math.max(0, (product.stock_quantity ?? 0) - qty);
        await admin
          .from("products")
          .update({ stock_quantity: next })
          .eq("id", product.id);
      }
    }
  }
}
