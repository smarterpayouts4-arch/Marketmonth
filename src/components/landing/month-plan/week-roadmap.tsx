import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { MonthPlanImage } from "./month-plan-image";
import {
  weekPlannedCount,
  weekProgressPercent,
  type MarketingWeek,
} from "./types";

type WeekRoadmapCardProps = {
  week: MarketingWeek;
  selected: boolean;
  onSelect: () => void;
};

function WeekRoadmapCard({ week, selected, onSelect }: WeekRoadmapCardProps) {
  const plannedCount = weekPlannedCount(week);
  const progress = weekProgressPercent(week);

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border bg-card text-left transition-all outline-none",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        selected
          ? "border-primary ring-1 ring-primary/50 shadow-soft"
          : "border-border hover:border-primary/40 hover:shadow-soft"
      )}
    >
      <div className="relative aspect-[2/1] w-full overflow-hidden bg-muted">
        <MonthPlanImage
          src={week.heroImageSrc}
          alt={week.heroImageAlt}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        />
        <span className="absolute top-2 left-2 rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-background uppercase">
          {week.label}
        </span>
        {selected ? (
          <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft">
            <Check className="size-3" strokeWidth={3} aria-hidden />
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-3 py-2.5">
        <p className="font-display text-[13px] leading-snug font-semibold text-foreground">
          {week.theme}
        </p>
        <div className="mt-auto">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] font-medium text-text-muted">
            {plannedCount} / {week.totalCount} planned
          </p>
        </div>
      </div>
    </button>
  );
}

type WeekRoadmapProps = {
  weeks: MarketingWeek[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

export function WeekRoadmap({ weeks, selectedIndex, onSelect }: WeekRoadmapProps) {
  return (
    <div
      role="tablist"
      aria-label="Month roadmap weeks"
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4"
    >
      {weeks.map((week, index) => (
        <WeekRoadmapCard
          key={week.id}
          week={week}
          selected={index === selectedIndex}
          onSelect={() => onSelect(index)}
        />
      ))}
    </div>
  );
}
