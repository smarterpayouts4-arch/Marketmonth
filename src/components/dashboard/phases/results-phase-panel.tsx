import { analyticsInsights } from "@/data/mock-analytics";

type ResultsPhasePanelProps = {
  unlocked: boolean;
};

export function ResultsPhasePanel({ unlocked }: ResultsPhasePanelProps) {
  if (!unlocked) {
    return (
      <div className="max-w-xl rounded-2xl border border-dashed border-border bg-card/60 p-8">
        <p className="text-xs font-semibold tracking-[0.12em] text-text-muted uppercase">
          Results
        </p>
        <h2 className="mt-2 text-section">Lessons appear after publishing</h2>
        <p className="mt-3 text-base text-text-secondary">
          Once content is live, we&apos;ll show what topics, hooks, and formats
          your audience responds to — and what to make more of next month.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl animate-fade-in">
      <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">
        What your audience responds to
      </p>
      <h2 className="mt-2 text-section">Simple lessons for next month</h2>

      <dl className="mt-8 space-y-5">
        <div className="border-b border-border pb-4">
          <dt className="text-xs text-text-muted">Best topic</dt>
          <dd className="mt-1 text-lg font-semibold">
            {analyticsInsights.bestTopic}
          </dd>
        </div>
        <div className="border-b border-border pb-4">
          <dt className="text-xs text-text-muted">Best hook</dt>
          <dd className="mt-1 text-lg font-semibold">
            {analyticsInsights.bestHook}
          </dd>
        </div>
        <div className="border-b border-border pb-4">
          <dt className="text-xs text-text-muted">Best platform · format</dt>
          <dd className="mt-1 text-lg font-semibold">
            {analyticsInsights.bestPlatform} · {analyticsInsights.bestFormat}
          </dd>
        </div>
      </dl>

      <blockquote className="mt-8 max-w-2xl border-l-2 border-warm pl-4 text-base leading-relaxed text-text-secondary">
        {analyticsInsights.recommendation}
      </blockquote>
    </div>
  );
}
