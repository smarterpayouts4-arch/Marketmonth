import type { BrandCore } from "@/brain/core/brand-core.schema";
import type { BrandCoreIdentity } from "@/brain/core/brand-core-identity";

import type { SelectedDirectionContract } from "./direction-contract";
import type {
  ClaimCapability,
  EvidenceSufficiencyResult,
} from "./evidence-sufficiency";
import { EVIDENCE_ADMISSION_POLICY_VERSION } from "./evidence-admission";

export const ATOM_BUILD_POLICY_VERSION = "atom-build-policy-v2" as const;

export type EnvelopeEvidenceItem = Readonly<{
  evidence_id: string;
  type: string;
  summary: string;
}>;

/**
 * Closed immutable build context. The compiler / generator must not fetch
 * beyond this envelope.
 */
export type AtomBuildEnvelope = Readonly<{
  brand: Readonly<{
    name: string;
    domain: string;
    positioning: string;
    voice: string;
    audience_primary: string;
  }>;
  banned_claims: readonly string[];
  evidence: readonly EnvelopeEvidenceItem[];
  claimCapabilities: readonly ClaimCapability[];
  brandConstraints: Readonly<{
    voice: string;
    promotionLevel: "none" | "soft" | "standard";
    complianceRules: readonly string[];
  }>;
  buildPolicyVersion: typeof ATOM_BUILD_POLICY_VERSION;
  evidenceAdmissionPolicyVersion: string;
  direction: Readonly<{
    directionId: string;
    angle: string;
    masterTitle: string;
    topicId?: string;
    grounding?: "candidate" | "user_typed";
    requirementsText: string;
    requiredElements: readonly string[];
    prohibitedDrift: readonly string[];
    punchline: string;
    brief: string;
    audienceProblem?: string;
    strategicPurpose: string;
    specificTopic?: string;
    corePromise?: string;
    suggestedFormat?: string;
    audienceTension: string;
    questionAnswered: string;
    thesisHypothesis: string;
    intendedPayoff: string;
  }>;
  topic: Readonly<{
    masterTitle: string;
    topicId?: string;
    grounding?: "candidate" | "user_typed";
    audience?: string;
    audiencePain?: string;
    /** Selected TopicCategoryId job (trust_proof, etc.). */
    topicCategory?: string;
  }>;
  preflight: EvidenceSufficiencyResult;
  identity: BrandCoreIdentity;
  cta_preferred: readonly string[];
  generationId?: string;
}>;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as object)) {
      deepFreeze(child);
    }
  }
  return value;
}

function resolvePromotionLevel(
  brandCore: BrandCore
): "none" | "soft" | "standard" {
  const banned = brandCore.banned_claims.join(" ").toLowerCase();
  if (/guarantee|cure|diagnose|medical advice/.test(banned)) return "soft";
  if (brandCore.cta_rules.preferred_actions.length === 0) return "none";
  return "standard";
}

/**
 * Build a closed envelope from Brand Core + contract + preflight.
 * No network / repository fetches.
 */
export function buildAtomEnvelope(input: {
  brandCore: BrandCore;
  identity: BrandCoreIdentity;
  contract: SelectedDirectionContract;
  preflight: EvidenceSufficiencyResult;
  generationId?: string;
}): AtomBuildEnvelope {
  const { brandCore, identity, contract, preflight, generationId } = input;
  const byId = new Map(
    brandCore.proof_library.map((p) => [p.proof_id, p] as const)
  );
  const evidence: EnvelopeEvidenceItem[] = [];
  for (const id of preflight.usableEvidenceIds) {
    const proof = byId.get(id);
    if (!proof) continue;
    evidence.push({
      evidence_id: proof.proof_id,
      type: proof.type,
      summary: proof.summary,
    });
  }

  const promotionLevel = resolvePromotionLevel(brandCore);

  const envelope: AtomBuildEnvelope = {
    brand: {
      name: brandCore.brand_name,
      domain: brandCore.domain,
      positioning: brandCore.positioning,
      voice: brandCore.voice,
      audience_primary: brandCore.audience.primary,
    },
    banned_claims: [...brandCore.banned_claims],
    evidence,
    claimCapabilities: [...preflight.claimCapabilities],
    brandConstraints: {
      voice: brandCore.voice,
      promotionLevel,
      complianceRules: [...brandCore.banned_claims.map((b) => `banned:${b}`)],
    },
    buildPolicyVersion: ATOM_BUILD_POLICY_VERSION,
    evidenceAdmissionPolicyVersion:
      preflight.admissionPolicyVersion ?? EVIDENCE_ADMISSION_POLICY_VERSION,
    direction: {
      directionId: contract.directionId,
      angle: contract.angle,
      masterTitle: contract.masterTitle,
      topicId: contract.topicId,
      grounding: contract.grounding,
      requirementsText: contract.requirementsText,
      requiredElements: [...contract.requiredElements],
      prohibitedDrift: [...contract.prohibitedDrift],
      punchline: contract.variation.punchline,
      brief: contract.variation.brief,
      audienceProblem: contract.variation.audienceProblem,
      strategicPurpose: contract.variation.strategicPurpose,
      specificTopic: contract.variation.specificTopic,
      corePromise: contract.variation.corePromise,
      suggestedFormat: contract.variation.suggestedFormat,
      audienceTension: contract.audienceTension,
      questionAnswered: contract.questionAnswered,
      thesisHypothesis: contract.thesisHypothesis,
      intendedPayoff: contract.intendedPayoff,
    },
    topic: {
      masterTitle: contract.masterTitle,
      topicId: contract.topicId,
      grounding: contract.grounding,
      audience: contract.selectedTopicContext?.audience,
      audiencePain: contract.selectedTopicContext?.audiencePain,
      topicCategory: contract.topicCategory,
    },
    preflight: {
      ...preflight,
      usableEvidenceIds: [...preflight.usableEvidenceIds],
      reasons: [...(preflight.reasons ?? [])],
      admitted: [...(preflight.admitted ?? [])],
      rejected: [...(preflight.rejected ?? [])],
      claimCapabilities: [...preflight.claimCapabilities],
    },
    identity,
    cta_preferred: [...brandCore.cta_rules.preferred_actions],
    generationId,
  };

  return deepFreeze(envelope);
}
