import type { DashboardPhase } from "@/data/mock-brand";

const PHASE_IDS: DashboardPhase[] = [
  "marketing-topic",
  "content",
  "review",
  "results",
];

/**
 * Normalize URL phase → dashboard phase.
 * Legacy `strategy` / invalid `learn` → marketing-topic.
 */
export function parseDashboardPhaseParam(
  raw: string | null
): DashboardPhase | null {
  if (!raw) return null;
  if (raw === "strategy" || raw === "learn") {
    return "marketing-topic";
  }
  return PHASE_IDS.includes(raw as DashboardPhase)
    ? (raw as DashboardPhase)
    : null;
}

export const MARKETING_TOPIC_HREF = "/dashboard?phase=marketing-topic";
/** @deprecated alias — use MARKETING_TOPIC_HREF */
export const STRATEGY_COMPAT_REDIRECT = MARKETING_TOPIC_HREF;
export const STRATEGY_DASHBOARD_HREF = MARKETING_TOPIC_HREF;
