import { cn } from "@/lib/utils";

type InsightCardProps = {
  label: string;
  value: string;
  className?: string;
};

export function InsightCard({ label, value, className }: InsightCardProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-soft",
        className
      )}
    >
      <p className="text-xs font-semibold tracking-[0.12em] text-text-muted uppercase">
        {label}
      </p>
      <p className="mt-3 text-xl font-semibold tracking-tight">{value}</p>
    </article>
  );
}
