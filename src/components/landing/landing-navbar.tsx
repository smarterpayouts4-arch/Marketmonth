import Link from "next/link";

import { PRODUCT_IDENTITY } from "@/seo/config/product-identity";

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-display text-[1.35rem] font-bold tracking-[-0.04em] text-foreground transition-colors group-hover:text-primary">
            {PRODUCT_IDENTITY.displayName}
          </span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-5">
          <Link
            href="/dashboard"
            className="hidden text-[0.95rem] font-medium text-text-secondary transition-colors hover:text-foreground sm:inline"
          >
            Open prototype
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}
