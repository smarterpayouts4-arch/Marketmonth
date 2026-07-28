"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";

import type { StrategyIntentAnswers } from "@/components/discovery/types";
import {
  goalLabel,
  reachLabel,
} from "@/components/discovery/to-strategy-moves";
import { cn } from "@/lib/utils";

const ROWS = [
  "Connecting your offer to the goal",
  "Selecting channel roles",
  "Building your first campaign",
] as const;

/** Pace under typical ~10–12s strategy latency; never auto-complete the last row. */
const ADVANCE_TO_ROW_1_MS = 3500;
const ADVANCE_TO_ROW_2_MS = 7500;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type DiscoveryGeneratingStrategyProps = {
  answers: StrategyIntentAnswers;
};

export function DiscoveryGeneratingStrategy({
  answers,
}: DiscoveryGeneratingStrategyProps) {
  // Last row stays active until parent unmounts when the API returns.
  const [activeRow, setActiveRow] = useState(() =>
    prefersReducedMotion() ? ROWS.length - 1 : 0
  );

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const timers = [
      window.setTimeout(() => setActiveRow(1), ADVANCE_TO_ROW_1_MS),
      window.setTimeout(() => setActiveRow(2), ADVANCE_TO_ROW_2_MS),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col animate-fade-in">
      <div className="shrink-0">
        <p className="font-display text-[1.05rem] font-semibold tracking-[-0.02em] text-foreground">
          Building your strategy…
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          Using the priorities you selected to shape your online marketing
          direction.
        </p>

        <dl className="mt-3 rounded-xl border border-border/80 bg-background/70 px-3 py-2.5 text-xs leading-snug">
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-text-muted">Goal</dt>
            <dd className="min-w-0 font-medium text-foreground">
              {goalLabel(answers.goal)}
            </dd>
          </div>
          <div className="mt-1 flex gap-2">
            <dt className="w-16 shrink-0 text-text-muted">Lead offer</dt>
            <dd className="min-w-0 line-clamp-1 font-medium text-foreground">
              {answers.promoteFirst}
            </dd>
          </div>
          <div className="mt-1 flex gap-2">
            <dt className="w-16 shrink-0 text-text-muted">Reach</dt>
            <dd className="min-w-0 font-medium text-foreground">
              {reachLabel(answers.reach)}
            </dd>
          </div>
          {answers.reach === "local" && answers.targetLocation ? (
            <div className="mt-1 flex gap-2">
              <dt className="w-16 shrink-0 text-text-muted">Location</dt>
              <dd className="min-w-0 line-clamp-1 font-medium text-foreground">
                {answers.targetLocation}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <ul className="mt-4 shrink-0 space-y-2">
        {ROWS.map((label, index) => {
          const done = activeRow > index;
          const active = activeRow === index;
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm",
                done && "text-foreground",
                active && "bg-primary/5 text-primary",
                !done && !active && "text-text-muted"
              )}
            >
              <span className="flex size-5 shrink-0 items-center justify-center">
                {done ? (
                  <Check className="size-4 text-primary" aria-hidden />
                ) : active ? (
                  <LoaderCircle
                    className="size-4 animate-spin text-primary"
                    aria-hidden
                  />
                ) : (
                  <span className="size-2 rounded-full bg-border" aria-hidden />
                )}
              </span>
              {label}
            </li>
          );
        })}
      </ul>
      <div className="min-h-0 flex-1" aria-hidden />
    </div>
  );
}
