import Link from "next/link";

import { PRODUCT_IDENTITY } from "@/seo/config/product-identity";

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-[4.25rem] max-w-[1280px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" className="group flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-full bg-primary text-[13px] font-bold tracking-tight text-primary-foreground"
          >
            M
          </span>
          <span className="font-display text-[1.2rem] font-bold tracking-[-0.04em] text-foreground transition-colors group-hover:text-primary sm:text-[1.3rem]">
            {PRODUCT_IDENTITY.displayName}
          </span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-5">
          <Link
            href="#demo-theater"
            className="hidden text-[0.95rem] font-medium text-text-secondary transition-colors hover:text-foreground sm:inline"
          >
            See it work
          </Link>
          <Link
            href="#analyze"
            className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Analyze my website
          </Link>
        </nav>
      </div>
    </header>
  );
}
