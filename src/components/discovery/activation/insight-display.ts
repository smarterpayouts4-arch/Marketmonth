/**
 * Deterministic insight vs Observed display helpers.
 * Suppress only normalized exact / near-identical duplicates — not fuzzy overlap.
 */

const TRIVIAL_PREFIX =
  /^(lead offer|the lead offer is|start with|observed|offer)\s*[:·-]?\s*/i;

export function normalizeInsightCompare(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(TRIVIAL_PREFIX, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when insight is the same statement as the first observed bullet. */
export function shouldSuppressInsight(
  insight: string,
  firstObserved?: string
): boolean {
  if (!insight.trim() || !firstObserved?.trim()) return false;
  const a = normalizeInsightCompare(insight);
  const b = normalizeInsightCompare(firstObserved);
  if (!a || !b) return false;
  if (a === b) return true;
  // Near-identical: one contains the other and shorter is most of the longer.
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (longer.includes(shorter) && shorter.length / longer.length >= 0.85) {
    return true;
  }
  return false;
}
