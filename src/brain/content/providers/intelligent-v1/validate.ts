import type { DirectionsBrandCoreSlice } from "@/brain/core";

import { evaluateSafety } from "../../safety";
import { normalizeInputTopic } from "../../normalize-topic";
import {
  INTELLIGENT_V1_VALIDATOR_VERSION,
  NEAR_DUPLICATE_JACCARD_THRESHOLD,
} from "./constants";
import type { IntelligentDirectionsResult } from "./schema";

export type IntelligentValidationResult = {
  validator_version: string;
  ok: boolean;
  errors: string[];
};

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3)
  );
}

function jaccard(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return inter / (ta.size + tb.size - inter);
}

/**
 * Deterministic grounding validation. Never invents or repairs IDs.
 */
export function validateIntelligentDirections(args: {
  result: IntelligentDirectionsResult;
  slice: DirectionsBrandCoreSlice;
  /** When set (manual / locked), master topic must match after normalize. */
  lockedMasterTopic?: string;
}): IntelligentValidationResult {
  const errors: string[] = [];
  const { result, slice } = args;

  const problemIds = new Set(
    slice.audiences.flatMap((a) => a.problems.map((p) => p.problem_id))
  );
  const offerIds = new Set(slice.offers.map((o) => o.offer_id));
  const claimById = new Map(slice.claims.map((c) => [c.claim_id, c]));
  const evidenceIds = new Set(slice.evidence.map((e) => e.evidence_id));
  const banned = slice.safety.banned_claims.map((b) => b.toLowerCase());
  const requiredQualifiers = slice.safety.required_qualifiers;

  if (args.lockedMasterTopic?.trim()) {
    const expected = normalizeInputTopic(args.lockedMasterTopic);
    const got = normalizeInputTopic(result.master_topic.topic);
    if (expected !== got) {
      errors.push(
        `Master topic mismatch after normalize: expected "${expected}" got "${got}"`
      );
    }
  }

  const checkIds = (
    label: string,
    ids: string[],
    known: Set<string> | Map<string, unknown>
  ) => {
    for (const id of ids) {
      const ok = known instanceof Set ? known.has(id) : known.has(id);
      if (!ok) errors.push(`${label} unknown id: ${id}`);
    }
  };

  checkIds("master.audience_problem", result.master_topic.audience_problem_ids, problemIds);
  checkIds("master.offer", result.master_topic.offer_ids, offerIds);
  checkIds("master.claim", result.master_topic.claim_ids, claimById);
  checkIds("master.evidence", result.master_topic.evidence_ids, evidenceIds);

  if (result.directions.length !== 6) {
    errors.push(`Expected 6 directions, got ${result.directions.length}`);
  }

  const texts: string[] = [];
  for (let i = 0; i < result.directions.length; i++) {
    const d = result.directions[i];
    const prefix = `direction[${i}]`;
    if (d.audience_problem_ids.length < 1) {
      errors.push(`${prefix} must reference at least one audience problem`);
    }
    checkIds(`${prefix}.audience_problem`, d.audience_problem_ids, problemIds);
    checkIds(`${prefix}.claim`, d.claim_ids, claimById);
    checkIds(`${prefix}.evidence`, d.evidence_ids, evidenceIds);

    const educational = d.non_claim_educational === true;
    if (!educational && d.claim_ids.length < 1) {
      errors.push(
        `${prefix} must reference an approved claim or set non_claim_educational`
      );
    }

    // Evidence must be permitted by selected claims
    const permitted = new Set<string>();
    for (const cid of d.claim_ids) {
      const claim = claimById.get(cid);
      if (claim) for (const eid of claim.allowed_evidence_ids) permitted.add(eid);
    }
    for (const eid of d.evidence_ids) {
      if (!permitted.has(eid)) {
        errors.push(
          `${prefix} evidence ${eid} not permitted by selected claims`
        );
      }
    }

    // Indiscriminate dump of all claims/evidence
    if (
      claimById.size > 1 &&
      d.claim_ids.length >= claimById.size &&
      evidenceIds.size > 2 &&
      d.evidence_ids.length >= evidenceIds.size
    ) {
      errors.push(`${prefix} references claims/evidence indiscriminately`);
    }

    for (const q of requiredQualifiers) {
      const hay = `${d.specific_topic} ${d.idea_summary}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) {
        errors.push(`${prefix} missing required qualifier: ${q}`);
      }
    }

    const safety = evaluateSafety(
      `${d.specific_topic} ${d.idea_summary} ${d.differentiation_summary}`
    );
    if (safety.status === "blocked") {
      errors.push(`${prefix} failed safety: ${safety.reasons.join("; ")}`);
    }
    for (const ban of banned) {
      const hay = `${d.specific_topic} ${d.idea_summary}`.toLowerCase();
      if (ban && hay.includes(ban)) {
        errors.push(`${prefix} contains banned claim language: ${ban}`);
      }
    }

    texts.push(`${d.specific_topic} ${d.idea_summary}`);
  }

  // Near-duplicate (wording) + differentiation_summary uniqueness
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const score = jaccard(texts[i], texts[j]);
      if (score >= NEAR_DUPLICATE_JACCARD_THRESHOLD) {
        errors.push(
          `Near-duplicate directions ${i} and ${j} (jaccard=${score.toFixed(2)} ≥ ${NEAR_DUPLICATE_JACCARD_THRESHOLD})`
        );
      }
    }
  }
  const diffs = result.directions.map((d) =>
    normalizeInputTopic(d.differentiation_summary)
  );
  if (new Set(diffs).size < diffs.length) {
    errors.push("differentiation_summary values must be unique across six ideas");
  }

  const masterSafety = evaluateSafety(
    `${result.master_topic.topic} ${result.master_topic.reason_summary}`
  );
  if (masterSafety.status === "blocked") {
    errors.push(`master topic failed safety: ${masterSafety.reasons.join("; ")}`);
  }

  return {
    validator_version: INTELLIGENT_V1_VALIDATOR_VERSION,
    ok: errors.length === 0,
    errors,
  };
}
