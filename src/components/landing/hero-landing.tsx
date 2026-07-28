"use client";

import { DiscoveryCard } from "@/components/discovery";
import { ContentUniverse } from "@/components/landing/content-universe";
import { DashboardGrowthPreview } from "@/components/landing/dashboard-growth-preview";
import { OrganicLoopTeaser } from "@/components/landing/organic-loop-teaser";

export function HeroLanding() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-5 lg:gap-6">
          <div className="flex h-full min-h-0 flex-col gap-3 animate-rise md:gap-4 lg:h-[var(--discovery-card-height)]">
            <div>
              <h1 className="max-w-[36ch] font-display text-[clamp(1.35rem,2.4vw,1.75rem)] font-semibold leading-[1.35] tracking-[-0.03em] text-foreground">
                Turn your website into a month of connected content.
              </h1>
              <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-text-secondary sm:text-[15px]">
                Market Month learns your brand, identifies what it should lead
                with, and expands a few strong ideas into platform-ready
                content.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-[15px]">
                See how your website can perform with our strategy.
              </p>
              <p className="mt-2.5 whitespace-nowrap text-xs font-medium tracking-wide text-text-muted sm:text-[13px]">
                Learn → Strategize → Build → Review
              </p>
            </div>

            <div className="mt-auto min-h-0">
              <ContentUniverse />
            </div>
          </div>

          <div className="h-full min-h-0 animate-rise-delay-2 lg:h-[var(--discovery-card-height)]">
            <DiscoveryCard />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 items-stretch gap-4 md:mt-8 md:grid-cols-2 md:gap-5">
          <OrganicLoopTeaser />
          <DashboardGrowthPreview />
        </div>
      </div>
    </section>
  );
}
