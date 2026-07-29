"use client";

import { Target } from "lucide-react";

import { ContentFormatCard } from "@/components/landing/content-format-card";
import { ContentFlowConnectors } from "@/components/landing/content-universe/connectors";
import { FORMATS } from "@/components/landing/content-universe/formats";
import { contentUniverseDisclaimer } from "@/components/landing/landing-copy";

const COUNT = FORMATS.length;

/**
 * Full Content Flow diagram: one core strategy topic distributing through
 * an animated network into five equal, illustrative output formats.
 *
 * Desktop/tablet (`md:` and up) render the true distribution network - a
 * shared relative container drives both the CSS Grid columns and the SVG
 * connector positions, so branches always land on a card's true center.
 * Below `md`, a simplified single connector line sits above a horizontal
 * snap-scroll row so five equal cards never have to cramp into a narrow
 * column.
 */
export function ContentUniverseVisual() {
  return (
    <div className="flex flex-col">
      <div className="mx-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-soft sm:items-center">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Target className="size-4" />
        </span>
        <div className="min-w-0 text-left">
          <p className="font-display text-[15px] font-semibold tracking-[-0.02em] text-foreground sm:text-base">
            Core Strategy Topic
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-text-secondary">
            One idea, expanded across formats.
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            Illustrative concept
          </p>
        </div>
      </div>

      {/* Distribution network + five equal outputs - md and up. */}
      <div className="relative mx-auto mt-2 hidden w-full max-w-5xl md:block">
        <div className="relative h-16">
          <ContentFlowConnectors count={COUNT} />
        </div>
        <ul className="grid grid-cols-5 gap-[1.8%]">
          {FORMATS.map((format) => (
            <ContentFormatCard key={format.id} format={format} />
          ))}
        </ul>
      </div>

      {/* Simplified connector + horizontal snap row - below md. */}
      <div className="mt-5 md:hidden">
        <div
          className="mx-auto flex flex-col items-center gap-1"
          aria-hidden="true"
        >
          <span className="animate-soft-pulse size-2 rounded-full bg-primary" />
          <span className="h-5 w-px bg-border" />
        </div>
        <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
          {FORMATS.map((format) => (
            <ContentFormatCard
              key={format.id}
              format={format}
              className="w-[168px] shrink-0 snap-start"
            />
          ))}
        </ul>
      </div>

      <p className="mt-6 text-center text-[12px] font-medium text-text-muted">
        {contentUniverseDisclaimer}
      </p>
    </div>
  );
}
