import { DailyContentCard } from "./daily-content-card";
import {
  spellNumber,
  weekExecutionCount,
  type MarketingWeek,
} from "./types";

type DailyContentGridProps = {
  week: MarketingWeek;
};

export function DailyContentGrid({ week }: DailyContentGridProps) {
  const ideaCount = week.posts.length;
  const executionCount = weekExecutionCount(week);

  return (
    <div id="month-plan-daily-grid" className="scroll-mt-24">
      <p className="mb-1.5 text-xs text-text-secondary">
        One weekly theme, transformed into {spellNumber(ideaCount)} daily
        ideas and {spellNumber(executionCount)} channel-specific posts.
      </p>
      <p className="mb-2.5 text-xs font-semibold tracking-[0.08em] text-text-muted uppercase">
        {week.label} content plan
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {week.posts.map((post) => (
          <DailyContentCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
