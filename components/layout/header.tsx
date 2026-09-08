"use client";

import Link from "next/link";
import { useCart } from "@/lib/store/cart";
import { Button } from "@/components/ui/button";

export function Header() {
  const totalItems = useCart((state) => state.totalItems());

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold tracking-tight">VendorFlow</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            href="/products"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Products
          </Link>
          <Link
            href="/cart"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Cart
          </Link>
          <Link
            href="/account"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Account
          </Link>
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Cart */}
          <Link href="/cart" className="relative">
            <Button variant="ghost" size="icon" className="relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Button>
          </Link>

          {/* Account / Login */}
          <Link href="/auth/login">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
