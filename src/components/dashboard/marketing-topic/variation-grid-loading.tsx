"use client";

type VariationGridLoadingProps = {
  mode: "automatic" | "manual" | null;
  brandName: string;
  regenerating: boolean;
};

/**
 * Directions Brain thinking UX — progress language, not a spinner-only void.
 */
export function VariationGridLoading({
  mode,
  brandName,
  regenerating,
}: VariationGridLoadingProps) {
  const steps = regenerating
    ? [
        "Re-checking brand context…",
        "Refreshing concrete opportunities…",
        "Scoring grounding for each direction…",
      ]
    : mode === "automatic"
      ? [
          `Reading what ${brandName} is actually about…`,
          "Finding one strong master topic…",
          "Drafting up to six concrete opportunities…",
        ]
      : [
          "Anchoring your topic as the master umbrella…",
          "Expanding into concrete opportunity cells…",
          "Checking each direction is grounded…",
        ];

  return (
    <div
      className="mt-4 rounded-xl border border-border bg-card/60 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 text-sm font-medium text-foreground">
        <span
          className="inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
        <span>Directions Brain is thinking</span>
      </div>
      <ol className="mt-3 space-y-1.5 pl-1 text-sm text-text-secondary">
        {steps.map((step) => (
          <li key={step} className="flex gap-2">
            <span className="text-primary" aria-hidden>
              ·
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
