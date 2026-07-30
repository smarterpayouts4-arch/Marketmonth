import type { BrandCore } from "@/brain/core/brand-core.schema";

import type { SelectedDirectionContract } from "./direction-contract";
import {
  admitEvidence,
  EVIDENCE_ADMISSION_POLICY_VERSION,
  type AdmissionDecision,
} from "./evidence-admission";

export type PreflightStatus =
  | "ready"
  | "limited"
  | "insufficient"
  | "direction_conflict";

export type ClaimCapability = {
  claimRuleId: string;
  evidenceIds: string[];
  permittedMeaning: string;
  requiredQualification?: string;
  prohibitedExpansion: string[];
};

export type EvidenceSufficiencyResult = {
  status: PreflightStatus;
  usableEvidenceIds: string[];
  missingInformation: string[];
  /** @deprecated Prefer claimCapabilities — kept for transitional callers. */
  allowedClaimRules: string[];
  qualifiedClaimRules: string[];
  forbiddenClaimRules: string[];
  notes: string[];
  /** Explicit demotion / diagnostic reasons (brief "reasons"). */
  reasons: string[];
  admissionPolicyVersion: typeof EVIDENCE_ADMISSION_POLICY_VERSION;
  admitted: AdmissionDecision[];
  rejected: Array<{ proof_id: string; reason: string }>;
  claimCapabilities: ClaimCapability[];
};

function buildClaimCapabilities(
  brandCore: BrandCore,
  usableEvidenceIds: string[]
): ClaimCapability[] {
  const byId = new Map(
    brandCore.proof_library.map((p) => [p.proof_id, p] as const)
  );
  const banned = [...brandCore.banned_claims];
  const caps: ClaimCapability[] = [];

  for (const id of usableEvidenceIds) {
    const proof = byId.get(id);
    if (!proof) continue;
    caps.push({
      claimRuleId: `rule_${id}`,
      evidenceIds: [id],
      permittedMeaning: proof.summary,
      requiredQualification: undefined,
      prohibitedExpansion: [
        ...banned,
        "fabricated_evidence_id",
        "placeholder_evidence_id",
      ],
    });
  }

  // Optional synthesis rules for pairs of strong proofs (max 3)
  for (let i = 0; i < Math.min(usableEvidenceIds.length - 1, 3); i++) {
    const a = usableEvidenceIds[i]!;
    const b = usableEvidenceIds[i + 1]!;
    const pa = byId.get(a);
    const pb = byId.get(b);
    if (!pa || !pb) continue;
    caps.push({
      claimRuleId: `rule_synthesis_${i + 1}`,
      evidenceIds: [a, b],
      permittedMeaning: `${pa.summary} | ${pb.summary}`,
      prohibitedExpansion: [...banned, "fabricated_evidence_id"],
    });
  }

  return caps;
}

/**
 * Closed-world preflight before envelope / generation.
 * user_typed grounding → limited at best.
 *
 * Admission: preferred first, then relevance/role backfill to a soft target
 * of 6–8. Never fewer than prefer ∩ library (quality-softened).
 */
export function runEvidenceSufficiencyPreflight(input: {
  brandCore: BrandCore;
  contract: SelectedDirectionContract;
}): EvidenceSufficiencyResult {
  const { brandCore, contract } = input;
  const library = brandCore.proof_library;
  const libraryIds = new Set(library.map((p) => p.proof_id));
  const missingInformation: string[] = [];
  const notes: string[] = [];
  const reasons: string[] = [];

  const prefer = contract.evidenceRequirements.preferIds.filter((id) =>
    libraryIds.has(id)
  );

  const preferredMissing = contract.evidenceRequirements.preferIds.filter(
    (id) => !libraryIds.has(id)
  );
  if (preferredMissing.length > 0) {
    notes.push(
      `preferred evidence ids not in Brand Core: ${preferredMissing.slice(0, 5).join(", ")}`
    );
  }

  if (library.length === 0) {
    missingInformation.push("Brand Core proof_library is empty");
  }
  if (!brandCore.audience.primary.trim()) {
    missingInformation.push("audience.primary");
  }
  if (!brandCore.positioning.trim()) {
    missingInformation.push("positioning");
  }
  if (
    contract.requiredElements.includes("audience_problem") &&
    !contract.variation.audienceProblem?.trim() &&
    !contract.selectedTopicContext?.audiencePain?.trim()
  ) {
    missingInformation.push("audience_problem on direction or topic context");
  }

  const forbiddenClaimRules = [
    ...brandCore.banned_claims.map((b) => `banned:${b}`),
    "fabricated_evidence_id",
    "placeholder_evidence_id",
  ];
  const allowedClaimRules = [
    "observed_from_envelope_evidence",
    "inferred_when_evidence_suggests",
    "recommended_when_advice_supported",
  ];
  const qualifiedClaimRules = [
    "qualify_outcomes_without_guarantees",
    "mark_inferred_vs_observed_explicitly",
  ];

  // True conflict: preferred IDs look like Brand Core proof ids but none resolve.
  // Must run BEFORE admission backfill so conflict is not masked.
  const preferredLookLikeProofIds =
    contract.evidenceRequirements.preferIds.length > 0 &&
    contract.evidenceRequirements.preferIds.every((id) =>
      id.startsWith("proof_")
    );
  if (
    preferredLookLikeProofIds &&
    prefer.length === 0 &&
    library.length > 0
  ) {
    return {
      status: "direction_conflict",
      usableEvidenceIds: [],
      missingInformation: [
        ...missingInformation,
        "selected direction proof ids do not intersect Brand Core proof_library",
      ],
      allowedClaimRules,
      qualifiedClaimRules,
      forbiddenClaimRules,
      notes,
      reasons: ["direction_conflict: prefer_ids_miss_proof_library"],
      admissionPolicyVersion: EVIDENCE_ADMISSION_POLICY_VERSION,
      admitted: [],
      rejected: contract.evidenceRequirements.preferIds.map((id) => ({
        proof_id: id,
        reason: "prefer_miss_library",
      })),
      claimCapabilities: [],
    };
  }

  if (
    contract.evidenceRequirements.preferIds.length > 0 &&
    prefer.length === 0 &&
    library.length > 0
  ) {
    notes.push(
      "direction evidence ids do not match proof_library; admitting Brand Core proofs (limited)"
    );
    reasons.push("prefer_ids_unresolved_fallback_to_library");
  }

  const topicText = [
    contract.masterTitle,
    contract.selectedTopicContext?.masterTitle,
    contract.selectedTopicContext?.audiencePain,
    contract.selectedTopicContext?.subjectLabel,
  ]
    .filter(Boolean)
    .join(" ");
  const directionText = [
    contract.variation.punchline,
    contract.variation.brief,
    contract.variation.audienceProblem,
    contract.variation.strategicPurpose,
    contract.requirementsText,
  ]
    .filter(Boolean)
    .join(" ");

  const admission = admitEvidence({
    library: library.map((p) => ({
      proof_id: p.proof_id,
      type: p.type,
      summary: p.summary,
    })),
    preferIds: contract.evidenceRequirements.preferIds,
    topicText,
    directionText,
    angle: contract.angle,
  });

  const usableEvidenceIds = admission.usableEvidenceIds;

  if (usableEvidenceIds.length === 0) {
    return {
      status: "insufficient",
      usableEvidenceIds: [],
      missingInformation: [
        ...missingInformation,
        "no usable evidence ids for closed-world generation",
      ],
      allowedClaimRules,
      qualifiedClaimRules,
      forbiddenClaimRules,
      notes,
      reasons: [...reasons, "no_usable_evidence_after_admission"],
      admissionPolicyVersion: admission.policyVersion,
      admitted: admission.admitted,
      rejected: admission.rejected,
      claimCapabilities: [],
    };
  }

  const min = contract.evidenceRequirements.minUsable;
  let status: PreflightStatus =
    usableEvidenceIds.length >= min ? "ready" : "limited";

  if (
    contract.evidenceRequirements.preferIds.length > 0 &&
    prefer.length === 0
  ) {
    status = "limited";
    reasons.push("prefer_ids_unresolved");
  }

  if (contract.grounding === "user_typed") {
    notes.push("user_typed grounding caps preflight at limited");
    reasons.push("user_typed_grounding");
    if (status === "ready") status = "limited";
  }

  if (usableEvidenceIds.length < min) {
    missingInformation.push(
      `need at least ${min} usable evidence items for angle ${contract.angle} (have ${usableEvidenceIds.length})`
    );
    reasons.push(`below_min_usable_${usableEvidenceIds.length}_of_${min}`);
  }

  const claimCapabilities = buildClaimCapabilities(
    brandCore,
    usableEvidenceIds
  );

  return {
    status,
    usableEvidenceIds,
    missingInformation,
    allowedClaimRules,
    qualifiedClaimRules,
    forbiddenClaimRules,
    notes,
    reasons,
    admissionPolicyVersion: admission.policyVersion,
    admitted: admission.admitted,
    rejected: admission.rejected,
    claimCapabilities,
  };
}
