import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type BrandConfidenceProps = {
  score: number;
  className?: string;
};

export function BrandConfidence({ score, className }: BrandConfidenceProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-subtle/70 p-5 sm:flex sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          Brand Confidence
        </p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{score}%</p>
        <p className="mt-1 text-sm text-text-secondary">
          We found enough information to create your first strategy.
        </p>
      </div>
      <StatusBadge tone="success" className="mt-4 sm:mt-0">
        Ready to review
      </StatusBadge>
    </div>
  );
}
