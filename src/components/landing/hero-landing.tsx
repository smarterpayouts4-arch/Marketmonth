"use client";

import { DiscoveryCard } from "@/components/discovery";

export function HeroLanding() {
  return (
    <section className="relative overflow-visible bg-transparent">
      <div className="relative mx-auto max-w-[1280px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[minmax(0,0.48fr)_minmax(0,0.52fr)] md:gap-12 lg:gap-14">
          <div className="flex min-h-0 flex-col justify-center animate-rise lg:min-h-[var(--discovery-card-min-height)]">
            <h1 className="text-hero-serif max-w-[18ch] text-foreground">
              Let’s create your marketing plan around your website.
            </h1>
            <p className="mt-4 max-w-[38ch] text-[16px] leading-[1.55] text-text-secondary sm:text-[17px]">
              We’ll analyze your site, uncover what matters most, and turn it
              into a focused month of connected content.
            </p>
            <p className="mt-5 text-[14px] font-medium tracking-wide text-text-secondary sm:text-[15px]">
              <span className="text-primary">Learn</span>
              <span className="mx-2 text-text-muted">→</span>
              <span className="text-primary">Strategize</span>
              <span className="mx-2 text-text-muted">→</span>
              <span>Build</span>
              <span className="mx-2 text-text-muted">→</span>
              <span>Review</span>
            </p>
          </div>

          <div
            id="analyze"
            className="h-full min-h-0 w-full max-w-[var(--discovery-card-max-width)] justify-self-stretch scroll-mt-24 animate-rise-delay-2 md:justify-self-end"
          >
            <DiscoveryCard />
          </div>
        </div>
      </div>
    </section>
  );
}
