import { InsightCard } from "@/components/content/insight-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { analyticsInsights } from "@/data/mock-analytics";

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="GROW"
        title="What Your Audience Responds To"
        description="Insights that teach the AI what to create next — not vanity metrics alone."
        large
        actions={<StatusBadge tone="primary">Placeholder</StatusBadge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard label="Best Topic" value={analyticsInsights.bestTopic} />
        <InsightCard label="Best Hook" value={analyticsInsights.bestHook} />
        <InsightCard
          label="Best Platform"
          value={analyticsInsights.bestPlatform}
        />
        <InsightCard label="Best Format" value={analyticsInsights.bestFormat} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          Recommendation for next month
        </p>
        <p className="mt-3 max-w-3xl text-base text-text-secondary">
          {analyticsInsights.recommendation}
        </p>
      </section>
    </div>
  );
}
