import { ReviewCard } from "@/components/content/review-card";
import { PageHeader } from "@/components/shared/page-header";
import { PrimaryButton } from "@/components/ui/primary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { reviewQueue } from "@/data/mock-review";

export default function ReviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="STEP 5 OF 6 · REVIEW"
        title="Review Queue"
        description="Approve, edit, or regenerate content quickly — designed for reviewing roughly a month of marketing in one focused session."
        large
        actions={
          <>
            <StatusBadge tone="primary">Placeholder</StatusBadge>
            <PrimaryButton>Approve All Ready Content</PrimaryButton>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {reviewQueue.map((item) => (
          <ReviewCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
