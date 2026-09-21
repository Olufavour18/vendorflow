import type { SupabaseClient } from "@supabase/supabase-js";

export type DeductStockResult = {
  ok: boolean;
  already_processed?: boolean;
  error?: string;
  failures?: Array<{
    product_id?: string;
    variant_id?: string | null;
    product_name?: string;
    requested?: number;
    available?: number;
  }>;
  remaining?: Array<{
    product_id?: string;
    variant_id?: string | null;
    product_name?: string;
    remaining?: number;
    low_stock?: boolean;
    out_of_stock?: boolean;
    threshold?: number;
  }>;
};

/**
 * Atomic stock deduction via Postgres RPC (prevents overselling).
 */
export async function deductOrderStockAtomic(
  admin: SupabaseClient,
  orderId: string
): Promise<DeductStockResult> {
  const { data, error } = await admin.rpc("deduct_order_stock", {
    p_order_id: orderId,
  });

  if (error) {
    console.error("[stock] RPC error", error);
    return { ok: false, error: error.message };
  }

  return (data || { ok: false, error: "EMPTY_RPC_RESULT" }) as DeductStockResult;
}

/** @deprecated Prefer deductOrderStockAtomic */
export async function decrementStockForOrder(
  admin: SupabaseClient,
  orderId: string
): Promise<void> {
  const result = await deductOrderStockAtomic(admin, orderId);
  if (!result.ok && !result.already_processed) {
    throw new Error(result.error || "Stock deduction failed");
  }
}
