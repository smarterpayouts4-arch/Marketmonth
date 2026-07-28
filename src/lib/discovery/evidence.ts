import {
  type DiscoveryEvidence,
  type EvidenceConfidence,
  type EvidenceKind,
  discoveryEvidenceSchema,
} from "./evidence.schema";

export type {
  CrawlMeta,
  DiscoveryEvidence,
  EvidenceConfidence,
  EvidenceKind,
} from "./evidence.schema";
export { crawlMetaSchema, discoveryEvidenceSchema } from "./evidence.schema";

export function makeEvidence(input: {
  field: string;
  kind: EvidenceKind;
  value: string;
  sourceUrl?: string;
  sourcePageType?: string;
  confidence?: EvidenceConfidence;
  id?: string;
}): DiscoveryEvidence {
  return discoveryEvidenceSchema.parse({
    id: input.id ?? crypto.randomUUID(),
    field: input.field,
    kind: input.kind,
    value: input.value.trim().slice(0, 500),
    sourceUrl: input.sourceUrl,
    sourcePageType: input.sourcePageType,
    confidence: input.confidence ?? (input.kind === "observed" ? "high" : "medium"),
  });
}

export function userConfirmedFromIntent(intent: {
  goal: string;
  promoteFirst: string;
  reach: string;
  targetLocation?: string;
  growthDirection?: string;
  buyerTension?: string;
  brandCoreEdit?: string;
}): DiscoveryEvidence[] {
  const rows = [
    makeEvidence({
      field: "intent.goal",
      kind: "user_confirmed",
      value: intent.goal,
      confidence: "high",
    }),
    makeEvidence({
      field: "intent.promoteFirst",
      kind: "user_confirmed",
      value: intent.promoteFirst,
      confidence: "high",
    }),
    makeEvidence({
      field: "intent.reach",
      kind: "user_confirmed",
      value: intent.reach,
      confidence: "high",
    }),
  ];
  if (intent.targetLocation?.trim()) {
    rows.push(
      makeEvidence({
        field: "intent.targetLocation",
        kind: "user_confirmed",
        value: intent.targetLocation.trim(),
        confidence: "high",
      })
    );
  }
  if (intent.growthDirection?.trim()) {
    rows.push(
      makeEvidence({
        field: "intent.growthDirection",
        kind: "user_confirmed",
        value: intent.growthDirection.trim(),
        confidence: "high",
      })
    );
  }
  if (intent.buyerTension?.trim()) {
    rows.push(
      makeEvidence({
        field: "intent.buyerTension",
        kind: "user_confirmed",
        value: intent.buyerTension.trim(),
        confidence: "high",
      })
    );
  }
  if (intent.brandCoreEdit?.trim()) {
    rows.push(
      makeEvidence({
        field: "intent.brandCoreEdit",
        kind: "user_confirmed",
        value: intent.brandCoreEdit.trim(),
        confidence: "high",
      })
    );
  }
  return rows;
}

/** Recommended strategy items must cite at least one evidence id. */
export function assertRecommendedHasEvidence(
  evidenceIds: string[],
  label: string
): void {
  if (!evidenceIds.length) {
    throw new Error(`${label} must include evidenceIds`);
  }
}

export function evidenceById(
  evidence: DiscoveryEvidence[]
): Map<string, DiscoveryEvidence> {
  return new Map(evidence.map((item) => [item.id, item]));
}
