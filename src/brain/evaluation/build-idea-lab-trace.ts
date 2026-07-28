import type { BrainTraceStatus, BrainTraceStep } from "./idea-lab.types";

type StageDraft = {
  stage: string;
  modulePath: string;
  symbol?: string;
  status: BrainTraceStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number | null;
  inputSummary?: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
  warnings?: string[];
};

export const IDEA_LAB_TRACE_STAGES = [
  "CSV loaded",
  "CSV shape validated",
  "Fixture parsed",
  "Evidence normalized",
  "ContentBrainContext created",
  "BrandCore compiled",
  "Directions provider resolved",
  "Master topic generated",
  "Six ideas generated",
  "Output validated",
] as const;

export function startTimer(): { startedAt: string; t0: number } {
  return { startedAt: new Date().toISOString(), t0: Date.now() };
}

export function endTimer(t: { startedAt: string; t0: number }): {
  startedAt: string;
  completedAt: string;
  durationMs: number;
} {
  return {
    startedAt: t.startedAt,
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - t.t0,
  };
}

export function buildTrace(steps: StageDraft[]): BrainTraceStep[] {
  return steps.map((s, i) => ({
    step: i + 1,
    stage: s.stage,
    modulePath: s.modulePath,
    symbol: s.symbol,
    status: s.status,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    durationMs: s.durationMs ?? null,
    inputSummary: s.inputSummary,
    outputSummary: s.outputSummary,
    warnings: s.warnings,
  }));
}

/** Mark remaining stages skipped after a hard failure. */
export function skipRemaining(
  fromIndex: number,
  reason: string
): StageDraft[] {
  return IDEA_LAB_TRACE_STAGES.slice(fromIndex).map((stage) => ({
    stage,
    modulePath: "skipped",
    status: "skipped" as const,
    warnings: [reason],
    durationMs: null,
  }));
}
