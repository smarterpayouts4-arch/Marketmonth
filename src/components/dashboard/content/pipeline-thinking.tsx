"use client";

type PipelineThinkingProps = {
  stage: "atom" | "youtube_short" | "idle";
};

const COPY: Record<Exclude<PipelineThinkingProps["stage"], "idle">, string> = {
  atom: "Building the shared Content Atom…",
  youtube_short: "Crafting the YouTube Short package…",
};

/**
 * Lightweight stage thinking signal for Atom Builder + YouTube Short specialist.
 */
export function PipelineThinking({ stage }: PipelineThinkingProps) {
  if (stage === "idle") return null;
  return (
    <div
      className="flex items-center gap-2 text-sm text-text-secondary"
      role="status"
      aria-live="polite"
    >
      <span
        className="inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-hidden
      />
      <span>{COPY[stage]}</span>
    </div>
  );
}
