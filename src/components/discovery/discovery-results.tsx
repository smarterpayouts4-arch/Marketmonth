"use client";

/**
 * Discovery narrative Hook - three strategic rewards, then investment.
 * Formats grounded narrative only; does not invent options.
 */
import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

import {
  REVEAL_ORDER,
  shouldSuppressInsight,
  toDiscoveryActivation,
  type DiscoveryInvestments,
  type DiscoveryRevealId,
} from "@/components/discovery/activation";
import { CadencePicker, CadenceRecommendationCard } from "@/components/discovery/discovery-results/cadence-picker";
import { ChannelPicker, PlatformAdaptationsList } from "@/components/discovery/discovery-results/channel-picker";
import { ContentUniversePreview } from "@/components/discovery/discovery-results/content-universe-preview";
import { DiscoveryEvidenceAccordion } from "@/components/discovery/discovery-results/discovery-evidence-accordion";
import { DiscoveryTakeaway } from "@/components/discovery/discovery-results/discovery-takeaway";
import { PillarsList } from "@/components/discovery/discovery-results/pillars";
import type { DiscoveryResultsProps } from "@/components/discovery/discovery-results/types";
import type { CadenceLevel } from "@/lib/discovery/discovery-narrative.schema";
import { cn } from "@/lib/utils";

export function DiscoveryResults({
  profile,
  discoveryNarrative,
  onContinue,
  onTryAnother,
  voice = "you",
}: DiscoveryResultsProps) {
  const activation = useMemo(
    () =>
      toDiscoveryActivation(discoveryNarrative, {
        voice,
        businessName: profile.businessName,
      }),
    [discoveryNarrative, voice, profile.businessName]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [viewed, setViewed] = useState<Record<DiscoveryRevealId, boolean>>({
    "doing-well": true,
    win: false,
    "content-play": false,
  });
  const [cadenceLevel, setCadenceLevel] = useState<CadenceLevel | undefined>();
  const [channels, setChannels] = useState<string[]>(() =>
    discoveryNarrative.detectedChannels
      .filter((c) => c.status === "link-detected")
      .map((c) => c.platform)
  );
  const [pillarId, setPillarId] = useState<string | undefined>(
    discoveryNarrative.contentPillars[0]?.id
  );

  const activeId = REVEAL_ORDER[activeIndex]!;
  const reveal = activation.reveals[activeIndex]!;
  const stepLabel = `YOUR DISCOVERY · ${activeIndex + 1} OF 3`;
  const lowEvidenceHeader =
    activation.headerEvidenceLevel === "low" ||
    activation.evidenceQuality === "low";
  const onContentPlay = activeId === "content-play";
  const allRewardsViewed =
    viewed["doing-well"] && viewed.win && viewed["content-play"];

  const firstObserved = reveal.evidence.find((e) => e.kind === "observed")?.text;
  const showInsight =
    Boolean(reveal.insight.trim()) &&
    !shouldSuppressInsight(reveal.insight, firstObserved);

  function goTo(index: number) {
    const next = Math.max(0, Math.min(REVEAL_ORDER.length - 1, index));
    const id = REVEAL_ORDER[next]!;
    setActiveIndex(next);
    setViewed((prev) => ({ ...prev, [id]: true }));
  }

  function markVisitedAndNext() {
    if (activeIndex < REVEAL_ORDER.length - 1) {
      goTo(activeIndex + 1);
    }
  }

  function toggleChannel(platform: string) {
    setChannels((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  }

  const investmentsReady =
    allRewardsViewed &&
    Boolean(cadenceLevel) &&
    channels.length > 0 &&
    Boolean(pillarId);

  const investments: DiscoveryInvestments | null = investmentsReady
    ? {
        cadenceLevel: cadenceLevel!,
        channels,
        pillarId,
      }
    : null;

  function onFooterRight() {
    if (!onContentPlay) {
      markVisitedAndNext();
      return;
    }
    if (investments) onContinue(investments);
  }

  const rightDisabled = onContentPlay ? !investments : false;
  const rightLabel = !onContentPlay
    ? "Continue →"
    : discoveryNarrative.primaryCta || "Build my content month";

  const transitionTeaser =
    !onContentPlay && reveal.transition
      ? reveal.transition
      : !onContentPlay
        ? "Next, we’ll show where consistent publishing can help you win."
        : null;

  return (
    <div className="flex flex-col animate-fade-in">
      <header className="shrink-0 space-y-1">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-primary uppercase">
          {stepLabel}
        </p>
        {activeIndex === 0 ? (
          <>
            <h2 className="font-serif text-[1.2rem] font-semibold leading-snug tracking-[-0.02em] text-foreground sm:text-[1.3rem]">
              {activation.introHeadline ||
                (lowEvidenceHeader
                  ? "Your website gives us a starting point."
                  : "Your website gives us a strong foundation.")}
            </h2>
            <p className="max-w-[48ch] text-[13px] leading-snug text-text-secondary">
              {activation.introDescription ||
                (lowEvidenceHeader
                  ? "Help us sharpen the decisions that will shape what you publish this month."
                  : "We studied your business and found the strongest social-media story already inside it.")}
            </p>
          </>
        ) : (
          <h2 className="font-serif text-[1.15rem] font-semibold leading-snug tracking-[-0.02em] text-foreground sm:text-[1.25rem]">
            {reveal.label}
          </h2>
        )}
      </header>

      <nav
        aria-label="Discovery sections"
        className="mt-3 flex flex-wrap gap-1.5"
      >
        {activation.reveals.map((r, index) => {
          const selected = index === activeIndex;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => goTo(index)}
              aria-current={selected ? "step" : undefined}
              className={cn(
                "relative z-10 min-h-8 rounded-full border px-2.5 py-1.5 text-left transition-colors sm:px-3",
                selected
                  ? "border-primary bg-primary/12 font-semibold text-primary shadow-[inset_0_0_0_1px_rgba(49,105,90,0.12)]"
                  : "border-border/80 bg-subtle/70 text-text-secondary hover:border-border hover:text-foreground"
              )}
            >
              <span className="text-[11px] font-semibold sm:text-xs">
                {r.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-3 space-y-2.5">
        <p className="text-[13px] font-medium leading-snug text-foreground">
          {reveal.question}
        </p>

        {showInsight ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-primary/15 bg-primary/[0.08] px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] leading-snug font-semibold text-foreground sm:text-[15px]">
                {reveal.insight}
              </p>
              <p className="mt-1 text-[10px] font-semibold tracking-[0.1em] text-text-muted uppercase">
                Insight
              </p>
            </div>
          </div>
        ) : null}

        {reveal.clarification ? (
          <p className="rounded-lg bg-subtle/80 px-3 py-2 text-xs text-text-secondary">
            {reveal.clarification}
          </p>
        ) : null}

        <DiscoveryEvidenceAccordion items={reveal.evidenceItems} />

        {reveal.takeaway ? (
          <DiscoveryTakeaway text={reveal.takeaway} />
        ) : null}

        {onContentPlay ? (
          <div className="space-y-3 pt-0.5">
            <PillarsList
              pillars={discoveryNarrative.contentPillars}
              selectedId={pillarId}
              onSelect={setPillarId}
              selectable={allRewardsViewed}
            />
            <PlatformAdaptationsList
              adaptations={discoveryNarrative.platformAdaptations}
            />
            <CadenceRecommendationCard
              cadence={discoveryNarrative.cadence}
            />
            <ContentUniversePreview
              universe={discoveryNarrative.contentUniversePreview}
            />
            <p className="text-[13px] font-medium leading-snug text-foreground">
              {discoveryNarrative.finalDirection}
            </p>
            {allRewardsViewed ? (
              <div className="space-y-3 rounded-xl border border-border/80 bg-background/70 p-3">
                <p className="text-[10px] font-semibold tracking-[0.08em] text-primary uppercase">
                  Your investment
                </p>
                <CadencePicker
                  recommended={discoveryNarrative.cadence.level}
                  selected={cadenceLevel}
                  onSelect={setCadenceLevel}
                />
                <ChannelPicker
                  channels={discoveryNarrative.detectedChannels}
                  selected={channels}
                  onToggle={toggleChannel}
                />
                <p className="text-xs text-text-muted">
                  {discoveryNarrative.investmentQuestion}
                </p>
              </div>
            ) : (
              <p className="text-xs text-text-muted">
                Review all three sections before choosing cadence and channels.
              </p>
            )}
          </div>
        ) : null}

        {transitionTeaser ? (
          <p className="text-[11px] leading-snug text-text-muted">
            {transitionTeaser}
          </p>
        ) : null}
      </div>

      <div className="mt-3.5 flex flex-col-reverse items-stretch gap-2 border-t border-border/70 pt-3.5 sm:flex-row sm:items-center sm:justify-between">
        {activeIndex === 0 ? (
          <button
            type="button"
            onClick={onTryAnother}
            className="inline-flex h-10 items-center justify-center rounded-lg px-2 text-[13px] font-medium text-text-muted transition-colors hover:text-text-secondary"
          >
            {discoveryNarrative.secondaryCta || "Try another website"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            className="inline-flex h-10 items-center justify-center rounded-lg px-2 text-[13px] font-medium text-text-muted transition-colors hover:text-text-secondary"
          >
            Back
          </button>
        )}
        <div className="flex w-full flex-col items-stretch gap-1 sm:w-auto sm:items-end">
          <button
            type="button"
            disabled={rightDisabled}
            aria-disabled={rightDisabled}
            onClick={onFooterRight}
            className={cn(
              "inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary px-5 text-[13px] font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed sm:min-w-[9.5rem] sm:w-auto",
              rightDisabled ? "bg-primary/35 text-primary-foreground" : null
            )}
          >
            {rightLabel}
          </button>
          {rightDisabled && onContentPlay ? (
            <p className="text-[11px] text-text-muted">
              Choose cadence and at least one channel to continue
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export type { DiscoveryResultsProps };
export type { DiscoveryRevealId };
