"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase-errors";
import { Button } from "@/components/ui/button";

export function DeleteProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete "${productName}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      alert(
        formatSupabaseError(
          authError,
          "Session expired. Please log in again."
        )
      );
      setLoading(false);
      return;
    }

    const { data: deletedRows, error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId)
      .select("id");

    if (error) {
      alert(
        formatSupabaseError(
          error,
          "Failed to delete product. Check your admin role and try again."
        )
      );
      setLoading(false);
      return;
    }

    // RLS can return success with 0 rows when policy blocks the delete
    if (!deletedRows || deletedRows.length === 0) {
      alert(
        "Delete blocked by security rules (RLS). " +
          "No rows were removed. Confirm your profile role is 'admin' in Supabase."
      );
      setLoading(false);
      return;
    }

    router.refresh();
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? "Deleting..." : "Delete"}
    </Button>
  );
}
