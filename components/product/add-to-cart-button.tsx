"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/store/cart";

type Props = {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    image?: string;
    sku?: string;
    stock_quantity: number;
  };
};

export function AddToCartButton({ product }: Props) {
  const [quantity, setQuantity] = useState(1);
  const addItem = useCart((state) => state.addItem);

  const handleAdd = () => {
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image: product.image,
      sku: product.sku,
      quantity,
    });
  };

  const isOutOfStock = product.stock_quantity <= 0;

  return (
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
          onClick={() =>
            setQuantity(Math.min(product.stock_quantity, quantity + 1))
          }
          disabled={isOutOfStock}
        >
          +
        </button>
      </div>

      <Button
        size="lg"
        className="flex-1"
        onClick={handleAdd}
        disabled={isOutOfStock}
      >
        {isOutOfStock ? "Out of Stock" : "Add to Cart"}
      </Button>
    </div>
  );
}
