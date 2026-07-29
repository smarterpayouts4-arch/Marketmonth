"use client";

import { ContentUniverseVisual } from "@/components/landing/content-universe-visual";
import {
  contentUniverseBadge,
  contentUniverseDisclaimer,
  contentUniverseHeadline,
  contentUniverseSubhead,
} from "@/components/landing/landing-copy";

/** Full-width Content Universe section below the landing hero. */
export function ContentUniverseSection() {
  return (
    <section
      className="relative px-5 pb-6 pt-16 sm:px-8 sm:pb-8 sm:pt-20 lg:px-12 lg:pt-24"
      aria-label="One strategy topic becomes multiple content formats"
    >
      <div className="mx-auto max-w-[1280px]">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold tracking-[0.06em] text-primary uppercase">
            {contentUniverseBadge}
          </p>
          <h2 className="mt-4 font-serif text-[clamp(1.35rem,2.4vw,1.75rem)] font-semibold tracking-[-0.02em] text-foreground">
            {contentUniverseHeadline}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary sm:text-base">
            {contentUniverseSubhead}
          </p>
          <p className="mt-2 text-xs font-medium tracking-wide text-text-muted">
            {contentUniverseDisclaimer}
          </p>
        </div>

        <div className="mt-10 sm:mt-12">
          <ContentUniverseVisual />
        </div>
      </div>
    </section>
  );
}
