export type EvidenceClassification = "observed" | "inferred" | "recommended";
export type EvidenceConfidence = "high" | "medium" | "low";

export type ScoreEvidenceQualityInput = {
  evidenceType: EvidenceClassification;
  confidence: EvidenceConfidence;
};

/** Quality ladder ported from discovery narrative scoring matrix. */
export function scoreEvidenceQuality({
  evidenceType,
  confidence,
}: ScoreEvidenceQualityInput): number {
  if (confidence === "low") return 0.2;
  if (evidenceType === "observed" && confidence === "high") return 1.0;
  if (evidenceType === "observed" && confidence === "medium") return 0.8;
  if (evidenceType === "inferred" && confidence === "high") return 0.7;
  if (evidenceType === "inferred" && confidence === "medium") return 0.55;
  if (evidenceType === "recommended" && confidence === "high") return 0.55;
  if (evidenceType === "recommended" && confidence === "medium") return 0.45;
  return 0.2;
}
