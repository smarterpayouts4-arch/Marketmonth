"use client";

import { useMemo, useState } from "react";

import { DiscoveryReadMore } from "@/components/discovery/discovery-read-more";
import { DiscoveryScrollRegion } from "@/components/discovery/discovery-scroll-region";
import { truncateAtSentence } from "@/components/discovery/to-card-summary/text";
import type {
  DetectedLocationView,
  StrategyIntentAnswers,
} from "@/components/discovery/types";
import {
  formatCityState,
  formatDetectedLocation,
} from "@/lib/discovery/location.schema";
import { cn } from "@/lib/utils";

const FOUND_LINE_MAX = 96;

const GOALS: { id: StrategyIntentAnswers["goal"]; label: string }[] = [
  { id: "awareness", label: "Awareness" },
  { id: "leads", label: "Leads" },
  { id: "sales", label: "Sales" },
  { id: "loyalty", label: "Customer loyalty" },
];

const REACH: { id: StrategyIntentAnswers["reach"]; label: string }[] = [
  { id: "local", label: "Local" },
  { id: "national", label: "National" },
  { id: "online_broad", label: "Global" },
];

const FIELD =
  "mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-border focus:ring-1 focus:ring-border";

type DiscoveryIntentProps = {
  defaultPromoteFirst: string;
  foundAudience: string;
  foundOffer: string;
  foundPresence: string[];
  detectedLocations: DetectedLocationView[];
  onContinue: (answers: StrategyIntentAnswers) => void;
  onBack: () => void;
};

type LocationOption = {
  cityState: string;
  fullAddress: string;
};

function shortPromoteDefault(value: string, max = 72): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const first = cleaned.split(",")[0]?.trim() || cleaned;
  if (first.length <= max) return first;
  return `${first.slice(0, max - 1).trimEnd()}…`;
}

function toLocationOption(loc: DetectedLocationView): LocationOption | null {
  const cityState = formatCityState(loc);
  if (!cityState) return null;
  const fullAddress = formatDetectedLocation(loc);
  return { cityState, fullAddress };
}

export function DiscoveryIntent({
  defaultPromoteFirst,
  foundAudience,
  foundOffer,
  foundPresence,
  detectedLocations,
  onContinue,
  onBack,
}: DiscoveryIntentProps) {
  const options = useMemo(() => {
    const preferred = detectedLocations.filter(
      (l) => l.confidence === "high" || l.confidence === "medium"
    );
    const source =
      preferred.filter((l) => l.confidence === "high").length > 0
        ? preferred.filter((l) => l.confidence === "high")
        : preferred;

    const byKey = new Map<string, LocationOption>();
    for (const loc of source) {
      const option = toLocationOption(loc);
      if (!option) continue;
      const key = option.cityState.toLowerCase();
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, option);
        continue;
      }
      // Prefer a longer grounded street address for the confirmation line.
      if (
        option.fullAddress.length > existing.fullAddress.length &&
        option.fullAddress !== option.cityState
      ) {
        byKey.set(key, option);
      }
    }
    return Array.from(byKey.values()).slice(0, 6);
  }, [detectedLocations]);

  const suggestedLocation = options.length === 1 ? options[0].cityState : "";
  const hasGroundedLocation = options.length > 0;

  const [goal, setGoal] =
    useState<StrategyIntentAnswers["goal"]>("awareness");
  const [promoteFirst, setPromoteFirst] = useState(() =>
    shortPromoteDefault(defaultPromoteFirst)
  );
  const [reach, setReach] = useState<StrategyIntentAnswers["reach"]>(() =>
    hasGroundedLocation ? "local" : "online_broad"
  );
  const [locationOverride, setLocationOverride] = useState<string | null>(null);

  const targetLocation =
    locationOverride !== null ? locationOverride : suggestedLocation;

  const selectedOption =
    options.find((o) => o.cityState === targetLocation) ??
    (options.length === 1 ? options[0] : undefined);

  const audiencePreview = truncateAtSentence(foundAudience, FOUND_LINE_MAX);
  const offerPreview = truncateAtSentence(foundOffer, FOUND_LINE_MAX);
  const presenceFull =
    foundPresence.length > 0
      ? foundPresence.join(" · ")
      : "No social links detected on the website";
  const presencePreview = truncateAtSentence(
    foundPresence.length > 0
      ? foundPresence.slice(0, 4).join(" · ")
      : presenceFull,
    FOUND_LINE_MAX
  );
  const foundOverflow =
    audiencePreview.wasTruncated ||
    offerPreview.wasTruncated ||
    presencePreview.wasTruncated ||
    foundPresence.length > 4;

  return (
    <div className="flex h-full min-h-0 flex-col animate-fade-in">
      <div className="shrink-0">
        <p className="font-display text-[1.05rem] font-semibold tracking-[-0.02em] text-foreground">
          Three quick details before your strategy
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          These answers help us turn what we found into a plan built for your
          goals.
        </p>
      </div>

      <DiscoveryScrollRegion
        aria-label="Strategy priorities"
        className="mt-3"
      >
        <div className="flex flex-col gap-2.5 pr-1 pb-1">
          <div className="rounded-xl border border-border/80 bg-background/70 px-3 py-2">
            <p className="text-[11px] font-semibold tracking-wide text-text-muted uppercase">
              What we found
            </p>
            <DiscoveryReadMore
              title="What we found"
              triggerLabel="View all findings"
              overflow={foundOverflow}
              description="Audience, offer, and presence signals from Discovery."
              preview={
                <dl className="mt-1.5 space-y-1 text-xs leading-snug text-foreground">
                  <div className="flex min-w-0 gap-2">
                    <dt className="shrink-0 text-text-muted">Audience</dt>
                    <dd className="min-w-0">{audiencePreview.text}</dd>
                  </div>
                  <div className="flex min-w-0 gap-2">
                    <dt className="shrink-0 text-text-muted">Lead offer</dt>
                    <dd className="min-w-0">{offerPreview.text}</dd>
                  </div>
                  <div className="flex min-w-0 gap-2">
                    <dt className="shrink-0 text-text-muted">Presence</dt>
                    <dd className="min-w-0">{presencePreview.text}</dd>
                  </div>
                </dl>
              }
            >
              <dl className="space-y-3 text-sm leading-relaxed text-foreground">
                <div>
                  <dt className="text-[11px] font-semibold tracking-wide text-text-muted uppercase">
                    Audience
                  </dt>
                  <dd className="mt-1">{foundAudience}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold tracking-wide text-text-muted uppercase">
                    Lead offer
                  </dt>
                  <dd className="mt-1">{foundOffer}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold tracking-wide text-text-muted uppercase">
                    Presence
                  </dt>
                  <dd className="mt-1">{presenceFull}</dd>
                </div>
              </dl>
            </DiscoveryReadMore>
          </div>

          <fieldset>
          <legend className="text-[11px] font-semibold tracking-wide text-text-muted uppercase">
            What is your primary goal?
          </legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {GOALS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setGoal(item.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  goal === item.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary/40"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block min-w-0">
          <span className="text-[11px] font-semibold tracking-wide text-text-muted uppercase">
            What should we promote first?
          </span>
          <input
            value={promoteFirst}
            onChange={(event) => setPromoteFirst(event.target.value)}
            className={FIELD}
          />
        </label>

        <fieldset>
          <legend className="text-[11px] font-semibold tracking-wide text-text-muted uppercase">
            Who are you trying to reach?
          </legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {REACH.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setReach(item.id);
                  if (item.id !== "local") setLocationOverride(null);
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  reach === item.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary/40"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        {reach === "local" ? (
          <div className="block min-w-0">
            <span className="text-[11px] font-semibold tracking-wide text-text-muted uppercase">
              Target location
            </span>
            {options.length > 1 ? (
              <select
                value={targetLocation}
                onChange={(event) => setLocationOverride(event.target.value)}
                className={FIELD}
              >
                <option value="">Select a city found on the site</option>
                {options.map((opt) => (
                  <option key={opt.cityState} value={opt.cityState}>
                    {opt.cityState}
                  </option>
                ))}
              </select>
            ) : options.length === 0 ? (
              <input
                value={targetLocation}
                onChange={(event) => setLocationOverride(event.target.value)}
                placeholder="City, ST"
                className={FIELD}
              />
            ) : null}
            {selectedOption ? (
              <p
                className={cn(
                  "text-sm leading-snug text-foreground",
                  options.length > 1 ? "mt-1.5" : "mt-2"
                )}
              >
                <span className="font-semibold">{selectedOption.cityState}</span>
                {selectedOption.fullAddress &&
                selectedOption.fullAddress !== selectedOption.cityState ? (
                  <span className="mt-0.5 block text-xs text-text-muted">
                    {selectedOption.fullAddress}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : null}
        </div>
      </DiscoveryScrollRegion>

      <div className="mt-3 flex shrink-0 items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-11 items-center justify-center rounded-xl px-1 text-sm font-medium text-text-secondary hover:text-foreground"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!promoteFirst.trim()}
          onClick={() =>
            onContinue({
              goal,
              promoteFirst: promoteFirst.trim(),
              reach,
              targetLocation:
                reach === "local" && targetLocation.trim()
                  ? targetLocation.trim()
                  : undefined,
            })
          }
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          Build My Strategy →
        </button>
      </div>
    </div>
  );
}
