"use client";

/**
 * Discovery activation Hook — guided stepper with four reveals.
 * Formats grounded activation only; does not invent options.
 * Navigation ≠ investment: checkmarks only after real selection.
 */
import { useMemo, useState } from "react";

import {
  REVEAL_ORDER,
  growthFooterRightKind,
  isUseDirectionDisabled,
  nextCommittedAfterSelect,
  shouldSuppressInsight,
  toDiscoveryActivation,
  type ChoiceOption,
  type DiscoveryEvidence,
  type DiscoveryInvestments,
  type DiscoveryRevealId,
  type GrowthDirectionId,
} from "@/components/discovery/activation";
import { DiscoveryScrollRegion } from "@/components/discovery/discovery-scroll-region";
import { ChannelFooter } from "@/components/discovery/discovery-results/channels";
import { EvidenceGroups } from "@/components/discovery/discovery-results/evidence-groups";
import type { DiscoveryResultsProps } from "@/components/discovery/discovery-results/types";
import { toCardSummary } from "@/components/discovery/to-card-summary";
import { cn } from "@/lib/utils";

export function DiscoveryResults({
  profile,
  activationProfile,
  onContinue,
  onTryAnother,
  voice = "you",
}: DiscoveryResultsProps) {
  const activation = useMemo(
    () =>
      toDiscoveryActivation(activationProfile, {
        voice,
        businessName: profile.businessName,
      }),
    [activationProfile, voice, profile.businessName]
  );
  const summary = useMemo(() => toCardSummary(profile), [profile]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [buyerTension, setBuyerTension] = useState<string | undefined>();
  const [leadOffer, setLeadOffer] = useState<string | undefined>();
  const [selectedGrowthDirection, setSelectedGrowthDirection] = useState<
    GrowthDirectionId | undefined
  >();
  const [committedGrowthDirection, setCommittedGrowthDirection] = useState<
    GrowthDirectionId | undefined
  >();

  const activeId = REVEAL_ORDER[activeIndex]!;
  const reveal = activation.reveals[activeIndex]!;
  const stepLabel = `YOUR DISCOVERY · ${activeIndex + 1} OF 4`;
  const lowEvidenceHeader =
    activation.headerEvidenceLevel === "low" ||
    activation.evidenceQuality === "low";
  const onGrowth = activeId === "growth-opening";
  const growthRight = growthFooterRightKind({
    selected: selectedGrowthDirection,
    committed: committedGrowthDirection,
  });
  const growthCommitted = growthRight === "build";

  const committedGrowth = activation.growthDirections.find(
    (d) => d.id === committedGrowthDirection
  );

  const selectedTension = activation.buyerTensionOptions.find(
    (o) => o.label === buyerTension
  );
  const selectedLead = activation.leadOfferOptions.find(
    (o) => o.label === leadOffer
  );
  const selectedGrowthOpt = activation.growthDirections.find(
    (d) => d.id === (selectedGrowthDirection ?? committedGrowthDirection)
  );

  const stepEvidence: DiscoveryEvidence[] = useMemo(() => {
    if (activeId === "buyer-tension") {
      return (
        selectedTension?.evidence ??
        activation.buyerTensionOptions[0]?.evidence ??
        reveal.evidence
      );
    }
    if (activeId === "lead-offer") {
      return (
        selectedLead?.evidence ??
        activation.leadOfferOptions[0]?.evidence ??
        reveal.evidence
      );
    }
    if (activeId === "growth-opening") {
      return selectedGrowthOpt?.evidence ?? reveal.evidence;
    }
    return reveal.evidence;
  }, [
    activeId,
    selectedTension,
    selectedLead,
    selectedGrowthOpt,
    activation.buyerTensionOptions,
    activation.leadOfferOptions,
    reveal.evidence,
  ]);

  const firstObserved = stepEvidence.find((e) => e.kind === "observed")?.text;
  const showInsight =
    Boolean(reveal.insight.trim()) &&
    !shouldSuppressInsight(reveal.insight, firstObserved);

  function goTo(index: number) {
    const next = Math.max(0, Math.min(REVEAL_ORDER.length - 1, index));
    setActiveIndex(next);
  }

  function markVisitedAndNext() {
    if (activeIndex < REVEAL_ORDER.length - 1) {
      goTo(activeIndex + 1);
    }
  }

  function selectGrowthDirection(id: GrowthDirectionId) {
    setSelectedGrowthDirection(id);
    setCommittedGrowthDirection((prev) => nextCommittedAfterSelect(id, prev));
  }

  function commitGrowthDirection() {
    if (!selectedGrowthDirection) return;
    setCommittedGrowthDirection(selectedGrowthDirection);
  }

  const investments: DiscoveryInvestments | null =
    committedGrowthDirection && committedGrowth
      ? {
          growthDirection: committedGrowthDirection,
          growthThesis: committedGrowth.thesis,
          strategyGoal: committedGrowth.strategyGoal,
          buyerTension: buyerTension?.trim() || undefined,
          leadOffer:
            leadOffer?.trim() ||
            activation.leadOfferOptions[0]?.label ||
            undefined,
          // brandCoreEdit intentionally omitted unless user edits later
        }
      : null;

  const invested = {
    "brand-core": false,
    "buyer-tension": Boolean(buyerTension?.trim()),
    "lead-offer": Boolean(leadOffer?.trim()),
    "growth-opening": Boolean(committedGrowthDirection),
  } as const;

  type FooterRight =
    | { kind: "continue" }
    | { kind: "use-direction" }
    | { kind: "build" };

  const footerRight: FooterRight = !onGrowth
    ? { kind: "continue" }
    : { kind: growthRight };

  const rightDisabled =
    footerRight.kind === "use-direction"
      ? isUseDirectionDisabled(selectedGrowthDirection)
      : footerRight.kind === "build"
        ? !investments
        : false;

  function onFooterRight() {
    if (footerRight.kind === "continue") {
      markVisitedAndNext();
      return;
    }
    if (footerRight.kind === "use-direction") {
      commitGrowthDirection();
      return;
    }
    if (investments) onContinue(investments);
  }

  const rightLabel =
    footerRight.kind === "continue"
      ? "Continue"
      : footerRight.kind === "use-direction"
        ? "Use this direction"
        : "Build my month around this →";

  return (
    <div className="flex h-full min-h-0 flex-col animate-fade-in">
      <header className="shrink-0 space-y-1 px-0.5">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-primary uppercase">
          {stepLabel}
        </p>
        {activeIndex === 0 ? (
          <>
            <p className="font-display text-[1.05rem] font-semibold tracking-[-0.02em] text-foreground sm:text-[1.1rem]">
              {lowEvidenceHeader
                ? "Your website gives us a starting point."
                : "Your website gives us a strong foundation."}
            </p>
            <p className="text-xs leading-snug text-text-secondary">
              {lowEvidenceHeader
                ? "Help us sharpen the decisions that will shape what you publish this month."
                : "Review the four decisions that will shape what you publish this month."}
            </p>
            <p className="text-[11px] leading-snug text-text-muted">
              Based on your public website. Review before building your plan.
            </p>
          </>
        ) : null}
      </header>

      <nav
        aria-label="Discovery reveals"
        className="mt-2.5 flex shrink-0 gap-1 overflow-x-auto pb-px"
      >
        {activation.reveals.map((r, index) => {
          const selected = index === activeIndex;
          const hasInvestment = invested[r.id];
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => goTo(index)}
              aria-current={selected ? "step" : undefined}
              className={cn(
                "relative z-10 shrink-0 rounded-t-lg border px-2.5 py-2 text-left transition-colors sm:px-3",
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-soft"
                  : "border-transparent bg-subtle/70 text-text-secondary hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold sm:text-[13px]">
                {hasInvestment ? (
                  <span aria-hidden className="text-[11px] opacity-90">
                    ✓
                  </span>
                ) : null}
                {r.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-xl rounded-tr-xl border border-border bg-card">
        <DiscoveryScrollRegion
          aria-label={`${reveal.label} discovery`}
          className="min-h-0"
          scrollKey={`${reveal.id}-${buyerTension ?? ""}-${leadOffer ?? ""}-${selectedGrowthDirection ?? ""}`}
        >
          <div className="space-y-2.5 px-4 py-2.5 pr-5 sm:px-5">
            <div className="space-y-2 animate-fade-in">
              <p className="text-sm font-medium text-text-secondary">
                {reveal.question}
              </p>
              {showInsight ? (
                <p className="text-sm leading-snug text-foreground">
                  {reveal.insight}
                </p>
              ) : null}
              {reveal.clarification || !reveal.insightEligible ? (
                <p className="rounded-lg bg-subtle/80 px-3 py-1.5 text-xs text-text-secondary">
                  {reveal.clarification ||
                    "Low-evidence read — continue if this still matches the business, or try another website."}
                </p>
              ) : null}

              <EvidenceGroups evidence={stepEvidence} />

              {activeId === "buyer-tension" ? (
                <ChoiceList
                  options={activation.buyerTensionOptions}
                  selectedLabel={buyerTension}
                  onSelect={setBuyerTension}
                />
              ) : null}

              {activeId === "lead-offer" ? (
                activation.leadOfferOptions.length === 0 ? (
                  <p className="text-xs text-text-secondary">
                    No product or service was detected confidently. Continue and
                    name the lead offer when you build your plan.
                  </p>
                ) : (
                  <ChoiceList
                    options={activation.leadOfferOptions}
                    selectedLabel={leadOffer}
                    onSelect={setLeadOffer}
                  />
                )
              ) : null}

              {activeId === "growth-opening" ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-text-muted">Pick one.</p>
                  <div className="flex flex-col gap-1.5">
                    {activation.growthDirections.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => selectGrowthDirection(opt.id)}
                        aria-pressed={selectedGrowthDirection === opt.id}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-left transition-colors",
                          selectedGrowthDirection === opt.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-border"
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {opt.title}
                          </span>
                          {opt.recommended && opt.confidence !== "low" ? (
                            <span className="shrink-0 text-[10px] font-semibold tracking-wide text-primary uppercase">
                              Recommended from your website
                            </span>
                          ) : opt.confidence === "low" ? (
                            <span className="shrink-0 text-[10px] font-semibold tracking-wide text-text-muted uppercase">
                              Low evidence
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-text-secondary">
                          {opt.description}
                        </span>
                      </button>
                    ))}
                  </div>
                  {growthCommitted && committedGrowth ? (
                    <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-foreground">
                      Direction saved. Your plan will{" "}
                      {committedGrowth.thesis.charAt(0).toLowerCase() +
                        committedGrowth.thesis.slice(1)}
                    </p>
                  ) : null}
                  <ChannelFooter summary={summary} />
                </div>
              ) : null}
            </div>
          </div>
        </DiscoveryScrollRegion>
      </div>

      <div className="mt-3 flex shrink-0 flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        {activeIndex === 0 ? (
          <button
            type="button"
            onClick={onTryAnother}
            className="inline-flex h-10 items-center justify-center rounded-lg px-2 text-sm font-medium text-text-muted transition-colors hover:text-text-secondary"
          >
            Try another website
          </button>
        ) : (
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            className="inline-flex h-10 items-center justify-center rounded-lg px-2 text-sm font-medium text-text-muted transition-colors hover:text-text-secondary"
          >
            Back
          </button>
        )}
        <button
          type="button"
          disabled={rightDisabled}
          aria-disabled={rightDisabled}
          onClick={onFooterRight}
          className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {rightLabel}
        </button>
      </div>
    </div>
  );
}

function ChoiceList({
  options,
  selectedLabel,
  onSelect,
}: {
  options: ChoiceOption[];
  selectedLabel?: string;
  onSelect: (label: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-text-muted">Pick one.</p>
      <div className="flex flex-col gap-1.5">
        {options.map((option) => (
          <ChoiceButton
            key={option.id}
            selected={selectedLabel === option.label}
            onClick={() => onSelect(option.label)}
            label={option.label}
            explanation={option.explanation}
            hint={
              option.recommended && option.confidence !== "low"
                ? "Recommended from your website"
                : option.confidence === "low"
                  ? "Low evidence — clarify if needed"
                  : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

function ChoiceButton({
  selected,
  onClick,
  label,
  explanation,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  explanation?: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex items-start gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition-colors",
        selected
          ? "border-primary bg-primary/5 font-medium text-foreground"
          : "border-border text-text-secondary hover:text-foreground"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full border",
          selected
            ? "border-primary bg-primary"
            : "border-border bg-background"
        )}
      >
        {selected ? (
          <span className="size-1.5 rounded-full bg-primary-foreground" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-foreground">{label}</span>
        {explanation ? (
          <span className="mt-0.5 block text-xs font-normal leading-snug text-text-secondary">
            {explanation}
          </span>
        ) : null}
        {hint ? (
          <span className="mt-0.5 block text-[10px] font-semibold tracking-wide text-primary uppercase">
            {hint}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export type { DiscoveryResultsProps };
export type { DiscoveryRevealId };
