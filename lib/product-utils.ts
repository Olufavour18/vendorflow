/** Shared catalog helpers — pure functions, no React */

export type ExpiryStatus = "none" | "fresh" | "near_expiry" | "expired";

export function salePrice(
  price: number,
  discountPercent?: number | null,
  compareAt?: number | null
): number {
  if (discountPercent != null && discountPercent > 0 && discountPercent <= 100) {
    return Math.round(price * (1 - discountPercent / 100) * 100) / 100;
  }
  // If compare_at is higher than price, price is already the sale price
  return price;
}

export function displayCompareAt(
  price: number,
  discountPercent?: number | null,
  compareAt?: number | null
): number | null {
  if (discountPercent != null && discountPercent > 0) {
    return price;
  }
  if (compareAt != null && compareAt > price) {
    return compareAt;
  }
  return null;
}

/** Near expiry = within `days` days (default 3). Empty expires_at = none. */
export function getExpiryStatus(
  expiresAt: string | Date | null | undefined,
  nearDays = 3
): ExpiryStatus {
  if (!expiresAt) return "none";
  const end = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  if (Number.isNaN(end.getTime())) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((end.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "expired";
  if (diffDays <= nearDays) return "near_expiry";
  return "fresh";
}

export function expiryLabel(status: ExpiryStatus): string | null {
  switch (status) {
    case "fresh":
      return "Fresh";
    case "near_expiry":
      return "Near Expiry";
    case "expired":
      return "Expired";
    default:
      return null;
  }
}

export function isLowStock(
  stock: number,
  threshold: number | null | undefined
): boolean {
  const t = threshold ?? 5;
  return stock > 0 && stock <= t;
}

export function isOutOfStock(stock: number): boolean {
  return stock <= 0;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const CONDITION_OPTIONS = [
  { value: "", label: "— Not set —" },
  { value: "FRESH", label: "Fresh" },
  { value: "GOOD", label: "Good" },
  { value: "NEAR_EXPIRY", label: "Near Expiry" },
  { value: "CLEARANCE", label: "Clearance" },
  { value: "EXPIRED", label: "Expired" },
  { value: "NEW", label: "New" },
  { value: "USED", label: "Used" },
] as const;

export const PRODUCT_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active (visible in store)" },
  { value: "INACTIVE", label: "Inactive (hidden)" },
  { value: "DRAFT", label: "Draft" },
  { value: "OUT_OF_STOCK", label: "Out of Stock" },
  { value: "ARCHIVED", label: "Archived" },
] as const;
