"use client";

/**
 * Dashboard home — Marketing Topic → Content → Review → Results.
 * Learn is not part of the dashboard workflow.
 */
import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { NextAction } from "@/components/dashboard/next-action";
import { PhaseTabBar } from "@/components/dashboard/phase-tab-bar";
import { MarketingTopicPhasePanel } from "@/components/dashboard/phases/marketing-topic-phase-panel";
import { ResultsPhasePanel } from "@/components/dashboard/phases/results-phase-panel";
import { ReviewPhasePanel } from "@/components/dashboard/phases/review-phase-panel";
import type { DashboardPhase } from "@/data/mock-brand";
import { usePrototypeMode } from "@/lib/prototype-mode";

import { nextCtaModel } from "./dashboard-home/next-cta";
import { parseDashboardPhaseParam } from "./dashboard-home/phase-query";
import { phaseStatuses } from "./dashboard-home/ph-statuses";

export function DashboardHome() {
  const { mode } = usePrototypeMode();
  return (
    <Suspense fallback={<div className="min-h-[280px]" aria-hidden />}>
      <DashboardHomeInner key={mode} />
    </Suspense>
  );
}

function DashboardHomeInner() {
  const { isCompleted } = usePrototypeMode();
  const searchParams = useSearchParams();
  const router = useRouter();
  const phaseFromUrl = parseDashboardPhaseParam(searchParams.get("phase"));

  const [phaseOverride, setPhaseOverride] = useState<DashboardPhase | null>(
    null
  );

  const defaultPhase: DashboardPhase = "marketing-topic";
  const activePhase = phaseOverride ?? phaseFromUrl ?? defaultPhase;

  const syncPhaseUrl = useCallback(
    (phase: DashboardPhase) => {
      setPhaseOverride(phase);
      const params = new URLSearchParams(searchParams.toString());
      params.set("phase", phase);
      router.replace(`/dashboard?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handlePhaseChange = useCallback(
    (phase: DashboardPhase) => {
      if (phase === "content") {
        router.push("/content");
        return;
      }
      syncPhaseUrl(phase);
    },
    [router, syncPhaseUrl]
  );

  const statuses = useMemo(
    () => phaseStatuses({ isCompleted, activePhase }),
    [activePhase, isCompleted]
  );

  const next = nextCtaModel({
    activePhase,
    isCompleted,
  });

  return (
    <main className="mx-auto w-full max-w-[1400px] px-6 py-2.5 lg:px-8 lg:py-3">
      <PhaseTabBar
        activePhase={activePhase}
        statuses={statuses}
        onChange={handlePhaseChange}
      />

      <div className="mt-3">
        {activePhase === "marketing-topic" ? (
          <MarketingTopicPhasePanel />
        ) : null}
        {activePhase === "review" ? (
          <ReviewPhasePanel unlocked={isCompleted} />
        ) : null}
        {activePhase === "results" ? (
          <ResultsPhasePanel unlocked={isCompleted} />
        ) : null}
      </div>

      {!next.hidden ? (
        next.pending ? (
          <div className="mt-8 rounded-2xl border border-border bg-muted/50 px-5 py-4 text-sm text-text-secondary">
            {next.description}
          </div>
        ) : (
          <div className="mt-8">
            <NextAction
              label={next.label}
              description={next.description}
              ctaLabel={next.cta}
              href={next.href}
            />
          </div>
        )
      ) : null}
    </main>
  );
}
