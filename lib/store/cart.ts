import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  /** Product id (always present) */
  id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  quantity: number;
  sku?: string;
  /** When set, this line is a specific variant of the product */
  variantId?: string;
  /** Human label e.g. "Large / 5kg" for display & order snapshot */
  variantLabel?: string;
  variantSku?: string;
  /** Stock available for this line (product or variant) at add time */
  maxStock?: number;
};

/** Unique key for a cart line: product alone or product+variant */
export function cartLineKey(item: {
  id: string;
  variantId?: string | null;
}): string {
  return item.variantId ? `${item.id}::${item.variantId}` : item.id;
}

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const key = cartLineKey(item);
        const existing = get().items.find((i) => cartLineKey(i) === key);
        if (existing) {
          set({
            items: get().items.map((i) =>
              cartLineKey(i) === key
                ? {
                    ...i,
                    quantity: i.quantity + (item.quantity || 1),
                    // Prefer newer price/stock snapshot
                    price: item.price,
                    maxStock: item.maxStock ?? i.maxStock,
                  }
                : i
            ),
          });
        } else {
          set({
            items: [
              ...get().items,
              { ...item, quantity: item.quantity || 1 },
            ],
          });
        }
      },

      removeItem: (lineKey) => {
        set({
          items: get().items.filter((i) => cartLineKey(i) !== lineKey),
        });
      },

      updateQuantity: (lineKey, quantity) => {
        if (quantity <= 0) {
          get().removeItem(lineKey);
          return;
        }
        set({
          items: get().items.map((i) =>
            cartLineKey(i) === lineKey ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: "vendorflow-cart",
    }
  )
);
