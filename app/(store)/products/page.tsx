import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product/product-card";

export default async function ProductsPage() {
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, price, images, stock_quantity, sku, vendors(business_name)"
    )
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching products:", error);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Marketplace</h1>
      <p className="text-muted-foreground mb-8 -mt-6">
        Browse products from all approved vendors.
      </p>

      {!products || products.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No products found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const vendor = product.vendors as
              | { business_name: string }
              | { business_name: string }[]
              | null;
            const vendorName = Array.isArray(vendor)
              ? vendor[0]?.business_name
              : vendor?.business_name;
            return (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                slug={product.slug}
                price={Number(product.price)}
                image={
                  Array.isArray(product.images)
                    ? product.images[0]
                    : undefined
                }
                stock_quantity={product.stock_quantity}
                sku={product.sku}
                vendorName={vendorName}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
