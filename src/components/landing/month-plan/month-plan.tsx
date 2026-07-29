"use client";

import { Pause, Play } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { augustMonthPlan } from "./data";
import { DailyContentGrid } from "./daily-content-grid";
import { MonthPlanIntroHeader } from "./intro-header";
import { StatusLegend } from "./status-legend";
import {
  resolveSelectedWeekIndex,
  weekAutoIndexFromVisibleWeeks,
} from "./types";
import { WeekDetailPanel } from "./week-detail-panel";
import { WeekRoadmap } from "./week-roadmap";

type MonthPlanProps = {
  playing: boolean;
  visibleWeeks: number;
  onToggle: () => void;
};

/**
 * Real product interface for the monthly content roadmap — replaces the
 * former demo-theater panel. Keeps the same Play/Pause affordance: pressing
 * Play auto-advances the selected week across the roadmap; clicking any
 * week card selects it directly and overrides auto-advance until Play is
 * pressed again.
 */
export function MonthPlan({ playing, visibleWeeks, onToggle }: MonthPlanProps) {
  const weeks = augustMonthPlan;
  const [manualIndex, setManualIndex] = useState<number | null>(null);

  const autoIndex = useMemo(
    () => weekAutoIndexFromVisibleWeeks(visibleWeeks, weeks.length),
    [visibleWeeks, weeks.length]
  );
  const selectedIndex = resolveSelectedWeekIndex(manualIndex, autoIndex);
  const selectedWeek = weeks[selectedIndex]!;

  const handleSelect = (index: number) => setManualIndex(index);

  const handleToggle = () => {
    setManualIndex(null);
    onToggle();
  };

  return (
    <div className="overflow-hidden rounded-[1.2rem] border border-border/90 bg-card shadow-lift ring-1 ring-foreground/5">
      <MonthPlanIntroHeader />

      <div className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-semibold tracking-[-0.02em] text-foreground">
                Your August Marketing Month
              </h3>
              <span className="rounded-full border border-border bg-subtle px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                Illustrative demo month
              </span>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              Your monthly content roadmap at a glance.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleToggle}
            className="h-9 gap-1.5 rounded-xl bg-accent px-3.5 font-semibold text-accent-foreground hover:bg-accent/90"
          >
            {playing ? (
              <>
                <Pause className="size-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="size-3.5" /> Play
              </>
            )}
          </Button>
        </div>

        <div className="mt-3.5">
          <WeekRoadmap
            weeks={weeks}
            selectedIndex={selectedIndex}
            onSelect={handleSelect}
          />
        </div>

        <div className="mt-3.5">
          <WeekDetailPanel week={selectedWeek} />
        </div>

        <div className="mt-3.5">
          <DailyContentGrid week={selectedWeek} />
        </div>

        <StatusLegend className="mt-3.5 border-t border-border pt-2.5" />
      </div>
    </div>
  );
}
