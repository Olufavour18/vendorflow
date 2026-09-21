import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import {
  salePrice,
  displayCompareAt,
  getExpiryStatus,
  expiryLabel,
} from "@/lib/product-utils";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      `
      id, name, slug, description, sku, price, compare_at_price, discount_percent,
      stock_quantity, low_stock_threshold, status, images, expires_at, condition,
      brand, unit, category_id,
      categories ( id, name, slug ),
      product_variants (
        id, name, brand, size, unit, sku, price, compare_at_price, discount_percent,
        stock_quantity, is_available, expires_at, condition, sort_order
      )
    `
    )
    .eq("slug", slug)
    .eq("status", "ACTIVE")
    .single();

  if (!product) {
    notFound();
  }

  const image =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : undefined;

  const variants = (
    (product.product_variants as Array<{
      id: string;
      name: string;
      brand?: string | null;
      size?: string | null;
      unit?: string | null;
      sku: string;
      price: number;
      compare_at_price?: number | null;
      discount_percent?: number | null;
      stock_quantity: number;
      is_available: boolean;
      expires_at?: string | null;
      condition?: string | null;
      sort_order?: number;
    }>) || []
  ).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const hasVariants = variants.some((v) => v.is_available);
  const basePrice = salePrice(
    Number(product.price),
    product.discount_percent,
    product.compare_at_price
  );
  const compareAt = displayCompareAt(
    Number(product.price),
    product.discount_percent,
    product.compare_at_price
  );

  const availablePrices = variants
    .filter((v) => v.is_available)
    .map((v) =>
      salePrice(Number(v.price), v.discount_percent, v.compare_at_price)
    );
  const minVariant = availablePrices.length
    ? Math.min(...availablePrices)
    : null;
  const maxVariant = availablePrices.length
    ? Math.max(...availablePrices)
    : null;

  const productExpiry = getExpiryStatus(product.expires_at);
  const category = product.categories as {
    id: string;
    name: string;
    slug: string;
  } | null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
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

        <div className="space-y-6">
          <div>
            {category && (
              <p className="text-sm text-muted-foreground mb-1">{category.name}</p>
            )}
            <h1 className="text-3xl font-bold">{product.name}</h1>
            {product.brand && (
              <p className="text-sm text-muted-foreground mt-1">
                Brand: {product.brand}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            {hasVariants && minVariant != null && maxVariant != null ? (
              <p className="text-3xl font-semibold">
                {minVariant === maxVariant
                  ? `₦${minVariant.toLocaleString()}`
                  : `₦${minVariant.toLocaleString()} – ₦${maxVariant.toLocaleString()}`}
              </p>
            ) : (
              <>
                <p className="text-3xl font-semibold">
                  ₦{basePrice.toLocaleString()}
                </p>
                {compareAt != null && (
                  <p className="text-lg text-muted-foreground line-through">
                    ₦{compareAt.toLocaleString()}
                  </p>
                )}
                {product.discount_percent != null &&
                  product.discount_percent > 0 && (
                    <span className="rounded bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5">
                      −{product.discount_percent}%
                    </span>
                  )}
              </>
            )}
          </div>

          {(product.condition || productExpiry !== "none") && (
            <div className="flex flex-wrap gap-2">
              {product.condition && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                  {String(product.condition).replace(/_/g, " ")}
                </span>
              )}
              {productExpiry !== "none" && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    productExpiry === "expired"
                      ? "bg-red-100 text-red-700"
                      : productExpiry === "near_expiry"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  {expiryLabel(productExpiry)}
                  {product.expires_at &&
                    ` · ${new Date(product.expires_at).toLocaleDateString()}`}
                </span>
              )}
            </div>
          )}

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
              discount_percent: product.discount_percent,
              compare_at_price: product.compare_at_price,
              image,
              sku: product.sku,
              stock_quantity: product.stock_quantity,
            }}
            variants={variants}
          />
        </div>
      </div>
    </div>
  );
}
