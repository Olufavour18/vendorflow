"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/store/cart";
import { salePrice } from "@/lib/product-utils";

export type VariantOption = {
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
};

type Props = {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    discount_percent?: number | null;
    compare_at_price?: number | null;
    image?: string;
    sku?: string;
    stock_quantity: number;
  };
  variants?: VariantOption[];
};

function variantLabel(v: VariantOption): string {
  const parts = [v.size, v.unit, v.brand].filter(Boolean);
  return parts.length ? parts.join(" · ") : v.name;
}

export function AddToCartButton({ product, variants = [] }: Props) {
  const availableVariants = variants.filter((v) => v.is_available);
  const hasVariants = availableVariants.length > 0;

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    hasVariants ? availableVariants[0].id : null
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCart((state) => state.addItem);

  const selected = hasVariants
    ? availableVariants.find((v) => v.id === selectedVariantId) ?? null
    : null;

  const unitPrice = selected
    ? salePrice(
        Number(selected.price),
        selected.discount_percent,
        selected.compare_at_price
      )
    : salePrice(
        Number(product.price),
        product.discount_percent,
        product.compare_at_price
      );

  const stock = selected ? selected.stock_quantity : product.stock_quantity;
  const isOutOfStock = stock <= 0;
  const displaySku = selected?.sku ?? product.sku;

  const handleAdd = () => {
    if (isOutOfStock) return;
    if (hasVariants && !selected) return;

    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: unitPrice,
      image: product.image,
      sku: displaySku,
      quantity,
      variantId: selected?.id,
      variantLabel: selected ? variantLabel(selected) : undefined,
      variantSku: selected?.sku,
      maxStock: stock,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="space-y-4">
      {hasVariants && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Choose option</p>
          <div className="flex flex-wrap gap-2">
            {availableVariants.map((v) => {
              const label = variantLabel(v);
              const vPrice = salePrice(
                Number(v.price),
                v.discount_percent,
                v.compare_at_price
              );
              const out = v.stock_quantity <= 0;
              const active = selectedVariantId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={out}
                  onClick={() => {
                    setSelectedVariantId(v.id);
                    setQuantity(1);
                  }}
                  className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                    active
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border hover:bg-muted"
                  } ${out ? "opacity-50 cursor-not-allowed line-through" : ""}`}
                >
                  <span className="font-medium">{label}</span>
                  <span className="ml-2 text-muted-foreground">
                    ₦{vPrice.toLocaleString()}
                  </span>
                  {out && (
                    <span className="ml-1 text-xs text-destructive">Sold out</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        {isOutOfStock ? (
          <span className="text-destructive font-medium">Out of stock</span>
        ) : (
          <span className="text-green-600 font-medium">
            In stock ({stock} available)
          </span>
        )}
        {displaySku && (
          <span className="text-muted-foreground">· SKU: {displaySku}</span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center border rounded-md">
          <button
            type="button"
            className="px-3 py-2 hover:bg-muted"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={isOutOfStock}
          >
            −
          </button>
          <span className="px-4 py-2 min-w-[3rem] text-center">{quantity}</span>
          <button
            type="button"
            className="px-3 py-2 hover:bg-muted"
            onClick={() => setQuantity(Math.min(stock, quantity + 1))}
            disabled={isOutOfStock}
          >
            +
          </button>
        </div>

        <Button
          size="lg"
          className="flex-1"
          onClick={handleAdd}
          disabled={isOutOfStock || (hasVariants && !selected)}
        >
          {isOutOfStock
            ? "Out of Stock"
            : added
              ? "Added ✓"
              : `Add to Cart — ₦${(unitPrice * quantity).toLocaleString()}`}
        </Button>
      </div>
    </div>
  );
}
