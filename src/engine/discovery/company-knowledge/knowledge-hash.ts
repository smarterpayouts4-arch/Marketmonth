import { createHash } from "node:crypto";

import type { ApprovedOverridesFile } from "../fixture-propose/apply-overrides";
import type { DiscoveryEvidence } from "@/lib/discovery/evidence.schema";

import type { CompanyKnowledge } from "./types";

/** Canonical JSON for hashing — sorted keys, no operational metadata. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

function evidenceRelationships(evidence: DiscoveryEvidence[]) {
  return evidence
    .map((e) => ({
      field: e.field,
      kind: e.kind,
      value: e.value,
      sourceUrl: e.sourceUrl,
      confidence: e.confidence,
    }))
    .sort((a, b) =>
      `${a.field}|${a.sourceUrl}|${a.value}`.localeCompare(
        `${b.field}|${b.sourceUrl}|${b.value}`
      )
    );
}

function overridePayload(overrides?: ApprovedOverridesFile) {
  if (!overrides) return null;
  return {
    entries: (overrides.entries ?? [])
      .filter(
        (e) => e.approvalStatus !== "rejected" && e.approvalStatus !== "pending"
      )
      .map((e) => ({ field: e.field, value: e.value }))
      .sort((a, b) => a.field.localeCompare(b.field)),
    fields: overrides.fields ?? {},
  };
}

/**
 * Hash of approved knowledge after overrides + canonical normalization.
 * Excludes timestamps, DB ids, export paths, backup names.
 */
export function computeKnowledgeHash(input: {
  knowledge: CompanyKnowledge;
  evidence: DiscoveryEvidence[];
  overrides?: ApprovedOverridesFile;
}): string {
  const payload = {
    identity: {
      businessName: input.knowledge.businessName,
      website: input.knowledge.website,
      description: input.knowledge.description,
    },
    indexedProducts: input.knowledge.indexedProducts,
    platformCapabilities: input.knowledge.platformCapabilities,
    services: input.knowledge.services,
    audience: input.knowledge.audience,
    valueProposition: input.knowledge.valueProposition,
    faqs: input.knowledge.faqs,
    differentiators: input.knowledge.differentiators,
    problemsSolved: input.knowledge.problemsSolved,
    brandVoice: input.knowledge.brandVoice,
    marketingOpportunity: input.knowledge.marketingOpportunity,
    socialProfiles: input.knowledge.socialProfiles,
    competitors: input.knowledge.competitors,
    evidence: evidenceRelationships(input.evidence),
    overrides: overridePayload(input.overrides),
  };
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}
