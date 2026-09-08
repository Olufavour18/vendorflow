export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          VendorFlow
        </h1>
        <p className="text-xl text-muted-foreground">
          AI-Powered Commerce & Fulfillment Platform
        </p>
        <p className="text-muted-foreground">
          Full-stack e-commerce + order management + warehouse + delivery + CRM
          automation system powered by n8n.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <a
            href="/products"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Shop Now
          </a>
          <a
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Sign In
          </a>
        </div>

        <p className="text-sm text-muted-foreground pt-8">
          Phase 1 Foundation — Project is now runnable
        </p>
      </div>
    </main>
  );
}
