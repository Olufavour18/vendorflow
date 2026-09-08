import Link from "next/link";
import { Button } from "@/components/ui/button";

const heroImages = [
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80",
  "https://images.unsplash.com/photo-1472851294608-73418fcba3ab?w=1200&q=80",
  "https://images.unsplash.com/photo-1555529902-526c04ebd429?w=1200&q=80",
];

const categories = [
  {
    name: "Electronics",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&q=80",
    href: "/products",
  },
  {
    name: "Fashion",
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&q=80",
    href: "/products",
  },
  {
    name: "Home & Living",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80",
    href: "/products",
  },
  {
    name: "Beauty",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80",
    href: "/products",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[70vh] min-h-[480px] overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImages[0]}
            alt="Welcome to VendorFlow Store"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        </div>

        {/* Welcome content */}
        <div className="relative h-full container mx-auto px-4 flex flex-col justify-center">
          <div className="max-w-2xl text-white space-y-6">
            <p className="text-sm uppercase tracking-widest text-white/80 font-medium">
              Welcome to VendorFlow
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              Discover Quality Products.
              <br />
              <span className="text-white/90">Delivered with Care.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-lg">
              Shop electronics, fashion, home essentials and more. Fast delivery,
              secure payments and excellent support.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link href="/products">
                <Button size="lg" className="bg-white text-black hover:bg-white/90 text-base px-8">
                  Shop Now
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10 text-base px-8"
                >
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight">Shop by Category</h2>
          <p className="text-muted-foreground mt-2">
            Explore our curated collections
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={cat.href}
              className="group relative aspect-[4/5] rounded-xl overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cat.image}
                alt={cat.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-semibold text-lg">{cat.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-muted/50">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to start shopping?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Browse hundreds of quality products from trusted vendors. Secure
            checkout and fast delivery across Nigeria.
          </p>
          <Link href="/products">
            <Button size="lg">View All Products</Button>
          </Link>
        </div>
      </section>

      {/* Footer note */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>VendorFlow — AI-Powered Commerce & Fulfillment Platform</p>
        </div>
      </footer>
    </div>
  );
}
