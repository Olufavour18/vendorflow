import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product/product-card";

export default async function ProductsPage() {
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, slug, price, images, stock_quantity, sku")
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching products:", error);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">All Products</h1>

      {!products || products.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No products found.</p>
          <p className="mt-2 text-sm">
            Add products from the admin dashboard or run the database seed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              slug={product.slug}
              price={Number(product.price)}
              image={product.images?.[0]}
              stock_quantity={product.stock_quantity}
              sku={product.sku}
            />
          ))}
        </div>
      )}
    </div>
  );
}
