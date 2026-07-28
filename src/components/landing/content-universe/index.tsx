"use client";

import { ContentUniverseVisual } from "@/components/landing/content-universe-visual";

/** Compact left-hero Content Universe card — natural height, never stretches. */
export function ContentUniverse() {
  return (
    <section
      className="cu-tree w-full rounded-2xl border border-border/80 bg-card px-4 py-4 shadow-soft sm:px-5 sm:py-4"
      aria-label="One marketing topic becomes six content formats"
    >
      <ContentUniverseVisual />
    </section>
  );
}
