import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import { MonthPlanImage } from "./month-plan-image";
import {
  formatChannelNames,
  weekChannelsCovered,
  weekExecutionCount,
  weekProgressPercent,
  weekStatusBreakdown,
  type MarketingWeek,
} from "./types";

function ProgressRing({ percent }: { percent: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);

  return (
    <div className="relative flex size-[78px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 84 84" className="size-full -rotate-90">
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="8"
        />
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute font-display text-base font-semibold text-foreground tabular-nums">
        {percent}%
      </span>
    </div>
  );
}

type WeekDetailPanelProps = {
  week: MarketingWeek;
};

export function WeekDetailPanel({ week }: WeekDetailPanelProps) {
  const progress = weekProgressPercent(week);
  const breakdown = weekStatusBreakdown(week);
  const ideaCount = week.posts.length;
  const executionCount = weekExecutionCount(week);
  const channelsCovered = weekChannelsCovered(week);

  return (
    <div className="grid gap-3.5 overflow-hidden rounded-[1.2rem] border border-border bg-card p-3 shadow-soft sm:p-3.5 lg:grid-cols-[1.05fr_1.3fr_0.85fr]">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted lg:aspect-auto lg:h-full lg:min-h-[160px]">
        <MonthPlanImage
          src={week.heroImageSrc}
          alt={week.heroImageAlt}
          sizes="(min-width: 1024px) 30vw, 100vw"
        />
      </div>

      <div className="flex flex-col justify-center gap-1.5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-primary-foreground uppercase">
            {week.label}
          </span>
          <span className="text-xs font-medium text-text-muted">
            {week.dateRange}
          </span>
        </div>
        <h3 className="font-display text-xl font-semibold tracking-[-0.01em] text-foreground">
          {week.theme}
        </h3>
        <p className="max-w-[52ch] text-xs leading-relaxed text-text-secondary">
          {week.description}
        </p>
        <p className="text-xs font-medium text-text-secondary">
          {ideaCount} ideas · {executionCount} channel executions ·{" "}
          {formatChannelNames(channelsCovered)}
        </p>
        <div className="mt-0.5 flex items-start gap-2 rounded-xl bg-subtle px-3 py-2.5">
          <span
            aria-hidden
            className="mt-0.5 size-2 shrink-0 rounded-full bg-primary"
          />
          <div>
            <p className="text-[13px] font-semibold text-primary-dark">
              {week.strategyTitle}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
              {week.strategyDescription}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-background p-2.5">
        <p className="text-xs font-semibold tracking-[0.06em] text-text-muted uppercase">
          {week.label} Progress
        </p>
        <div className="flex items-center gap-3">
          <ProgressRing percent={progress} />
          <ul className="space-y-1 text-xs text-text-secondary">
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-primary" />
              {breakdown.planned} Planned
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-warning" />
              {breakdown.scheduled} Scheduled
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-success" />
              {breakdown.published} Published
            </li>
          </ul>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-auto w-full justify-between rounded-lg"
          onClick={() => {
            document
              .getElementById("month-plan-daily-grid")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          View Week Strategy
          <ChevronRight className="size-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
