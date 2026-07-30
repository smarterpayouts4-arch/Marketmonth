import type { AtomBuildEnvelope } from "../build-envelope";
import type { ContentAtom } from "../content-atom.schema";

import type { AtomValidationViolation } from "./types";

const PLACEHOLDER_ID = /missing_evidence|placeholder|todo_evidence/i;

/**
 * Reject fabricated citations, placeholder evidence IDs, and unknown claim rules.
 */
export function validateClosedWorld(
  atom: ContentAtom,
  envelope: AtomBuildEnvelope
): AtomValidationViolation[] {
  const allowed = new Set(envelope.evidence.map((e) => e.evidence_id));
  const capIds = new Set(
    envelope.claimCapabilities.map((c) => c.claimRuleId)
  );
  const violations: AtomValidationViolation[] = [];

  atom.claimLedger.claims.forEach((claim, i) => {
    if (claim.claimRuleId && !capIds.has(claim.claimRuleId)) {
      violations.push({
        code: "unknown_claim_rule",
        path: `claimLedger.claims[${i}].claimRuleId`,
        message: `claim cites unknown claimRuleId: ${claim.claimRuleId}`,
        severity: "error",
      });
    }
    for (const eid of claim.evidenceIds) {
      if (!allowed.has(eid) || PLACEHOLDER_ID.test(eid)) {
        violations.push({
          code: "fabricated_citation",
          path: `claimLedger.claims[${i}].evidenceIds`,
          message: `claim cites non-envelope evidence_id: ${eid}`,
          severity: "error",
        });
      }
    }
    if (claim.claimRuleId?.startsWith("rule_synthesis_")) {
      if (claim.evidenceIds.length < 2) {
        violations.push({
          code: "synthesis_requires_multiple_ids",
          path: `claimLedger.claims[${i}].evidenceIds`,
          message: "synthesis claimRuleId requires at least two evidence IDs",
          severity: "error",
        });
      }
    }
  });

  atom.kernel.supporting_proof.forEach((proof, i) => {
    if (!allowed.has(proof.evidence_id) || PLACEHOLDER_ID.test(proof.evidence_id)) {
      violations.push({
        code: "fabricated_citation",
        path: `kernel.supporting_proof[${i}].evidence_id`,
        message: `proof cites non-envelope evidence_id: ${proof.evidence_id}`,
        severity: "error",
      });
    }
    if (proof.proof_id !== proof.evidence_id && !allowed.has(proof.proof_id)) {
      violations.push({
        code: "proof_id_mismatch",
        path: `kernel.supporting_proof[${i}].proof_id`,
        message: `proof_id ${proof.proof_id} is not an envelope evidence id`,
        severity: "warning",
      });
    }
  });

  const mod = atom.narrativeModules[atom.lineage.angle];
  mod?.supportingPoints.forEach((p, i) => {
    if (p.evidence_id && (!allowed.has(p.evidence_id) || PLACEHOLDER_ID.test(p.evidence_id))) {
      violations.push({
        code: "fabricated_citation",
        path: `narrativeModules.${atom.lineage.angle}.supportingPoints[${i}].evidence_id`,
        message: `supporting point cites non-envelope evidence_id: ${p.evidence_id}`,
        severity: "error",
      });
    }
  });

  return violations;
}
