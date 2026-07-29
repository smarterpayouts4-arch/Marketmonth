import type {
  DiscoveryClassification,
  DiscoveryConfidence,
} from "@/lib/discovery/discovery-narrative.schema";

import type { EvidenceItem } from "../types";
import { failsGenericInsight } from "./sanitize";

/** Scoring matrix from the discovery narrative spec. */
export function scoreEvidence(
  evidenceType: DiscoveryClassification,
  confidence: DiscoveryConfidence
): number {
  if (confidence === "low") return 0.2;
  if (evidenceType === "observed" && confidence === "high") return 1.0;
  if (evidenceType === "observed" && confidence === "medium") return 0.8;
  if (evidenceType === "inferred" && confidence === "high") return 0.7;
  if (evidenceType === "inferred" && confidence === "medium") return 0.55;
  if (evidenceType === "recommended" && confidence === "high") return 0.55;
  if (evidenceType === "recommended" && confidence === "medium") return 0.45;
  return 0.2;
}

/**
 * A discovery headline requires one strong observed/high signal, or
 * two mutually supporting medium-or-better signals.
 */
export function isHeadlineEligible(items: EvidenceItem[]): boolean {
  const usable = items.filter(
    (i) =>
      i.qualityScore >= 0.55 &&
      i.normalizedText &&
      !failsGenericInsight(i.normalizedText)
  );
  if (usable.some((i) => i.evidenceType === "observed" && i.confidence === "high")) {
    return true;
  }
  const mediumPlus = usable.filter((i) => i.qualityScore >= 0.55);
  return mediumPlus.length >= 2;
}

/** Source-priority sort: higher quality first, then completeness. */
export function compareEvidencePriority(a: EvidenceItem, b: EvidenceItem): number {
  if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
  const aLen = (a.normalizedText ?? "").length;
  const bLen = (b.normalizedText ?? "").length;
  return bLen - aLen;
}
