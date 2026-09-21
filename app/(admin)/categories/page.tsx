import { createClient } from "@/lib/supabase/server";
import {
  CategoryHierarchy,
  type CategoryRow,
} from "@/components/admin/category-hierarchy";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, name, slug, description, image_url, parent_id, is_active, sort_order"
    )
    .order("sort_order", { ascending: true });

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
        Could not load categories: {error.message}
      </div>
    );
  }

  return (
    <CategoryHierarchy initialCategories={(data as CategoryRow[]) || []} />
  );
}
