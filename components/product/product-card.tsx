"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useCart } from "@/lib/store/cart";

type ProductCardProps = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  stock_quantity?: number;
  sku?: string;
};

export function ProductCard({
  id,
  name,
  slug,
  price,
  image,
  stock_quantity = 0,
  sku,
}: ProductCardProps) {
  const addItem = useCart((state) => state.addItem);

  const handleAddToCart = () => {
    addItem({ id, name, slug, price, image, sku });
  };

  return (
    <Card className="overflow-hidden flex flex-col">
      <Link href={`/products/${slug}`} className="block">
        <div className="aspect-square bg-muted relative">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={name}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
        </div>
      </Link>
      <CardContent className="p-4 flex-1">
        <Link href={`/products/${slug}`}>
          <h3 className="font-medium line-clamp-2 hover:underline">{name}</h3>
        </Link>
        <p className="mt-1 text-lg font-semibold">
          ₦{price.toLocaleString()}
        </p>
        {stock_quantity <= 0 && (
          <p className="text-sm text-destructive mt-1">Out of stock</p>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full"
          onClick={handleAddToCart}
          disabled={stock_quantity <= 0}
        >
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}
