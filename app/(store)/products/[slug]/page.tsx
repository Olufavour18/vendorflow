import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddToCartButton } from "@/components/product/add-to-cart-button";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("status", "ACTIVE")
    .single();

  if (!product) {
    notFound();
  }

  const image = product.images?.[0];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No image available
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            {product.sku && (
              <p className="text-sm text-muted-foreground mt-1">
                SKU: {product.sku}
              </p>
            )}
          </div>

          <p className="text-3xl font-semibold">
            ₦{Number(product.price).toLocaleString()}
          </p>

          <div className="flex items-center gap-2">
            {product.stock_quantity > 0 ? (
              <span className="text-sm text-green-600 font-medium">
                In stock ({product.stock_quantity} available)
              </span>
            ) : (
              <span className="text-sm text-destructive font-medium">
                Out of stock
              </span>
            )}
          </div>

          {product.description && (
            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          <AddToCartButton
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: Number(product.price),
              image,
              sku: product.sku,
              stock_quantity: product.stock_quantity,
            }}
          />
        </div>
      </div>
    </div>
  );
}
