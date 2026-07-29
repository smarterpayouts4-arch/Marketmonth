import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import { ExecutionList } from "./execution-badge";
import { MonthPlanImage } from "./month-plan-image";
import { StatusDot } from "./status-legend";
import { CONTENT_TYPE_METADATA, type DailyContentItem } from "./types";

type DailyContentCardProps = {
  post: DailyContentItem;
  className?: string;
};

/**
 * One daily idea, not a bare post. Layout order matches the product spec:
 * day/date + status → idea title → short description → unique image →
 * content-type label → channel executions → total execution count.
 * Fixed min-heights on the title/description keep every card in a row the
 * same height regardless of text length.
 */
export function DailyContentCard({ post, className }: DailyContentCardProps) {
  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-soft",
        className
      )}
    >
      <header className="flex items-center justify-between gap-2 px-2.5 pt-2.5">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase">
          {post.day} · {post.date}
        </p>
        <StatusDot status={post.status} />
      </header>

      <div className="px-2.5 pt-1.5">
        <p className="line-clamp-2 min-h-[2.25rem] text-sm leading-snug font-semibold text-foreground">
          {post.title}
        </p>
        <p className="mt-1 line-clamp-2 min-h-[1.75rem] text-xs leading-snug text-text-secondary">
          {post.description}
        </p>
      </div>

      <div className="relative mt-2 aspect-[2/1] w-full overflow-hidden bg-muted">
        <MonthPlanImage src={post.imageSrc} alt={post.imageAlt} sizes="240px" />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-2.5 py-2">
        <StatusBadge tone="neutral" className="w-fit">
          {CONTENT_TYPE_METADATA[post.contentType].label}
        </StatusBadge>
        <ExecutionList executions={post.executions} />
        <p className="mt-auto pt-0.5 text-[11px] font-medium text-text-muted">
          {post.executions.length}{" "}
          {post.executions.length === 1 ? "channel version" : "channel versions"}
        </p>
      </div>
    </article>
  );
}
