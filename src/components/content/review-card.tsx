"use client";

import type { ReviewItem } from "@/data/mock-review";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

const statusTone = {
  needs_review: "warning",
  approved: "success",
  needs_changes: "danger",
} as const;

const statusLabel = {
  needs_review: "Needs Review",
  approved: "Approved",
  needs_changes: "Needs Changes",
} as const;

type ReviewCardProps = {
  item: ReviewItem;
};

export function ReviewCard({ item }: ReviewCardProps) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-text-muted">
            {item.platform} · {item.format}
          </p>
          <h3 className="mt-1 text-base font-semibold">{item.title}</h3>
        </div>
        <StatusBadge tone={statusTone[item.status]}>
          {statusLabel[item.status]}
        </StatusBadge>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button className="h-9 rounded-xl bg-success text-white hover:bg-success/90">
          Approve
        </Button>
        <Button variant="outline" className="h-9 rounded-xl">
          Edit
        </Button>
        <Button variant="ghost" className="h-9 rounded-xl">
          Regenerate
        </Button>
      </div>
    </article>
  );
}
