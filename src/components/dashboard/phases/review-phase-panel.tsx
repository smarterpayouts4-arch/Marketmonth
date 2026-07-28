import { reviewQueue } from "@/data/mock-review";
import { StatusBadge } from "@/components/ui/status-badge";

type ReviewPhasePanelProps = {
  unlocked: boolean;
};

const statusLabel = {
  needs_review: "Needs Review",
  approved: "Approved",
  needs_changes: "Needs Changes",
} as const;

const statusTone = {
  needs_review: "warning",
  approved: "success",
  needs_changes: "danger",
} as const;

export function ReviewPhasePanel({ unlocked }: ReviewPhasePanelProps) {
  if (!unlocked) {
    return (
      <div className="max-w-xl rounded-2xl border border-dashed border-border bg-card/60 p-8">
        <p className="text-xs font-semibold tracking-[0.12em] text-text-muted uppercase">
          Review
        </p>
        <h2 className="mt-2 text-section">Nothing to approve yet</h2>
        <p className="mt-3 text-base text-text-secondary">
          When your month is produced, you&apos;ll review and approve content in
          one focused session.
        </p>
      </div>
    );
  }

  const needsReview = reviewQueue.filter((item) => item.status === "needs_review").length;
  const approved = reviewQueue.filter((item) => item.status === "approved").length;
  const needsChanges = reviewQueue.filter(
    (item) => item.status === "needs_changes"
  ).length;

  return (
    <div className="max-w-3xl animate-fade-in">
      <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">
        Approval progress
      </p>
      <h2 className="mt-2 text-section">
        {needsReview} items waiting for your review
      </h2>

      <dl className="mt-6 flex flex-wrap gap-6 text-sm">
        <div>
          <dt className="text-text-muted">Needs review</dt>
          <dd className="mt-1 text-xl font-semibold">{needsReview}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Approved</dt>
          <dd className="mt-1 text-xl font-semibold">{approved}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Needs changes</dt>
          <dd className="mt-1 text-xl font-semibold">{needsChanges}</dd>
        </div>
      </dl>

      <ul className="mt-8 space-y-3">
        {reviewQueue.slice(0, 3).map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 border-b border-border py-3"
          >
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-0.5 text-xs text-text-muted">
                {item.platform} · {item.format}
              </p>
            </div>
            <StatusBadge tone={statusTone[item.status]}>
              {statusLabel[item.status]}
            </StatusBadge>
          </li>
        ))}
      </ul>
    </div>
  );
}
