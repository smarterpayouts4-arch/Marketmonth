import type { SeoRecommendation } from "../intelligence/contracts/recommendation";

const STATUSES = new Set([
  "New",
  "Accepted",
  "Rejected",
  "Implemented",
  "Recheck later",
]);

const IMPACTS = new Set(["High", "Medium", "Low", "None"]);
const CONFIDENCE = new Set(["Confirmed", "Probable", "Experimental"]);

export function verifyRecommendationShape(
  rec: SeoRecommendation
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!rec.finding?.trim()) errors.push("missing finding");
  if (!rec.whyItMatters?.trim()) errors.push("missing whyItMatters");
  if (!rec.evidence?.source?.trim()) errors.push("missing evidence.source");
  if (!IMPACTS.has(rec.impact)) errors.push(`invalid impact: ${rec.impact}`);
  if (!CONFIDENCE.has(rec.confidence)) {
    errors.push(`invalid confidence: ${rec.confidence}`);
  }
  if (!STATUSES.has(rec.status)) errors.push(`invalid status: ${rec.status}`);
  if (!Array.isArray(rec.affectedFiles) || rec.affectedFiles.length === 0) {
    errors.push("affectedFiles must list at least one path (or 'none')");
  }
  if (!rec.recommendation?.trim()) errors.push("missing recommendation");
  return { ok: errors.length === 0, errors };
}

export function verifyRecommendations(
  list: SeoRecommendation[]
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  list.forEach((rec, i) => {
    const r = verifyRecommendationShape(rec);
    if (!r.ok) {
      errors.push(`#${i}: ${r.errors.join("; ")}`);
    }
  });
  return { ok: errors.length === 0, errors };
}
