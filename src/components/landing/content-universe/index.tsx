"use client";

import { ContentUniverseVisual } from "@/components/landing/content-universe-visual";
import { LiveDot } from "@/components/landing/content-universe/live-dot";

/** Full-width Content Universe section below the landing hero. */
export function ContentUniverseSection() {
  return (
    <section
      className="relative px-5 pb-6 pt-16 sm:px-8 sm:pb-8 sm:pt-20 lg:px-12 lg:pt-24"
      aria-label="One strategy topic becomes multiple content formats"
    >
      <div className="mx-auto max-w-[1280px]">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-[11px] font-semibold tracking-[0.06em] text-success uppercase">
            <LiveDot />
            Live content flow
          </p>
          <h2 className="mt-4 font-serif text-[clamp(1.35rem,2.4vw,1.75rem)] font-semibold tracking-[-0.02em] text-foreground">
            One Strategy Topic. Multiple Content Formats.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary sm:text-base">
            We expand your core strategy into a connected content system.
          </p>
          <p className="mt-2 text-xs font-medium tracking-wide text-text-muted">
            Illustrative example — not real analytics
          </p>
        </div>

        <div className="mt-10 sm:mt-12">
          <ContentUniverseVisual />
        </div>
      </div>
    </section>
  );
}
