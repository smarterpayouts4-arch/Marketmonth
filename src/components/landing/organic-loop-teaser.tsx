import { organicLoopTeaser } from "@/components/landing/data/mock-landing-demo";

/** Nielsen: hint at publish & learn payoff — matched height with growth chart. */
export function OrganicLoopTeaser() {
  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-[1.25rem] border border-border bg-card p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-[0.78rem] font-semibold text-primary">
          Publish & learn
        </p>
        <span className="text-[11px] font-medium text-text-muted">
          {organicLoopTeaser.disclaimer}
        </span>
      </div>
      <p className="mt-1 text-sm text-text-secondary">
        See which hooks landed on TikTok vs YouTube — then improve next month.
      </p>
      <ul className="mt-5 flex flex-1 flex-col justify-center space-y-4">
        {organicLoopTeaser.bars.map((bar) => (
          <li key={bar.channel}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{bar.channel}</span>
              <span className="font-semibold tabular-nums text-foreground">
                {bar.value}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${bar.value}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
