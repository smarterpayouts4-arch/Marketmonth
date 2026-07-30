import { z } from "zod";

import { messageHash } from "./hash";

export const CONTENT_ATOM_SCHEMA_VERSION = "content-atom-v2" as const;
export const ATOM_POLICY_VERSION = "atom-policy-v2" as const;
export const ATOM_PROMPT_VERSION = "content-atom-generate-v4" as const;

export const hookFamilySchema = z.enum([
  "belief_challenge",
  "curiosity_gap",
  "contrast",
  "progression",
]);

export const creativeModeSchema = z.enum([
  "story",
  "demonstration",
  "comparison",
  "before_after",
  "belief_challenge",
  "educational_explanation",
  "case_study",
]);

export const buildStatusSchema = z.enum([
  "draft",
  "complete",
  "limited",
  "insufficient",
  "invalid",
]);

export const approvalStatusSchema = z.enum([
  "unreviewed",
  "approved",
  "changes_requested",
  "rejected",
  "locked",
]);

export const ledgerClaimTypeSchema = z.enum([
  "observed",
  "inferred",
  "recommended",
]);

export const centralClaimTypeSchema = z.enum([
  "observed",
  "inferred",
  "recommended",
  "opinion",
]);

export const atomLineageSchema = z.object({
  companyId: z.string().min(1).max(200),
  generationId: z.string().min(1).max(64).optional(),
  selectedDirectionId: z.string().min(1).max(64),
  brandCoreId: z.string().min(1).max(64),
  brandCoreHash: z.string().min(1).max(64),
  brandCoreVersion: z.union([z.string().min(1).max(64), z.number()]),
  topicId: z.string().min(1).max(64).optional(),
  masterTitle: z.string().min(1).max(280),
  angle: z.string().min(1).max(80),
  specificTopic: z.string().max(280).optional(),
  editorialAngle: z.string().max(160).optional(),
  corePromise: z.string().max(280).optional(),
  atomPolicyVersion: z.string().max(64).optional(),
  promptVersion: z.string().max(64).optional(),
  evidenceAdmissionPolicyVersion: z.string().max(64).optional(),
  model: z.string().max(80).optional(),
  createdAt: z.string().max(40).optional(),
  createdBy: z.enum(["deterministic", "model_assisted"]).optional(),
});

export const hookStrategySchema = z.object({
  family: hookFamilySchema,
  planted_question: z.string().min(1).max(280),
  withheld_information: z.string().max(200).optional(),
  resolution: z.string().min(1).max(400),
  opening_intent: z.string().min(1).max(400),
});

export const centralClaimSchema = z.object({
  claim_id: z.string().min(1).max(64),
  meaning: z.string().min(1).max(400),
  canonical_wording: z.string().min(1).max(400),
  claim_type: centralClaimTypeSchema,
});

export const supportingProofSchema = z.object({
  proof_id: z.string().min(1).max(64),
  meaning: z.string().min(1).max(400),
  /** Must be a real Brand Core proof_id (never a URL / source_ref). */
  evidence_id: z.string().min(1).max(64),
});

export const atomKernelSchema = z.object({
  audience_state: z.string().min(1).max(400),
  audience_problem: z.string().min(1).max(600),
  why_problem_exists: z.string().max(800),
  core_tension: z.string().min(1).max(600),
  central_claim: centralClaimSchema,
  belief_shift: z.object({
    from: z.string().min(1).max(200),
    to: z.string().min(1).max(200),
  }),
  resolution: z.string().max(400),
  payoff: z.string().min(1).max(600),
  supporting_proof: z.array(supportingProofSchema).max(12),
  intended_action: z.string().min(1).max(280),
  hook_strategy: hookStrategySchema,
});

export const supportingPointSchema = z.object({
  point: z.string().max(400),
  explanation: z.string().max(800),
  evidence_id: z.string().max(64),
});

export const distinctionSchema = z.object({
  thisIs: z.string().max(400),
  thisIsNot: z.string().max(400),
});

export const misunderstandingSchema = z.object({
  misunderstanding: z.string().max(400),
  correction: z.string().max(400),
});

export const canonicalNarrativeSpineSchema = z.object({
  triggerConcept: z.string().max(400),
  setup: z.string().max(800),
  problem: z.string().max(800),
  explanation: z.string().max(800),
  keyInsight: z.string().max(400),
  resolution: z.string().max(800),
  takeaway: z.string().max(400),
});

/** Typed narrative modules per brief 7.3 — empty strings allowed on thin path. */
export const narrativeModuleSchema = z.object({
  keyQuestion: z.string().max(400),
  supportingPoints: z.array(supportingPointSchema).max(12),
  importantDistinctions: z.array(distinctionSchema).max(8),
  commonMisunderstandings: z.array(misunderstandingSchema).max(8),
  framework: z.array(z.string().max(500)).max(12),
  steps: z.array(z.string().max(500)).max(12),
  comparisonCriteria: z.array(z.string().max(500)).max(12),
  objections: z.array(z.string().max(400)).max(12),
  canonicalNarrativeSpine: canonicalNarrativeSpineSchema,
});

export const narrativeModulesSchema = z.record(z.string(), narrativeModuleSchema);

export const engagementStrategySchema = z.object({
  internalAudienceTrigger: z.string().max(400),
  externalTriggerConcept: z.string().max(400),
  desiredConsumptionAction: z.string().max(280),
  actionFriction: z.string().max(280),
  contentPayoff: z.object({
    expectedValue: z.string().max(400),
    insightValue: z.string().max(400).optional(),
    practicalValue: z.string().max(400).optional(),
    emotionalValue: z.string().max(400).optional(),
  }),
  meaningfulAudienceInvestment: z.string().max(280).optional(),
  continuationTrigger: z.string().max(280).optional(),
  ethicalBoundaries: z.array(z.string().max(280)).max(12),
});

/** Presentation fields stay flat (live consumers); strategy is nested and locked. */
export const engagementBlueprintSchema = z.object({
  creative_mode: creativeModeSchema,
  visual_concept: z.string().min(1).max(400),
  opening_device: z.string().max(280).optional(),
  retention_notes: z.array(z.string().max(200)).max(8).optional(),
  strategy: engagementStrategySchema.optional(),
});

export const atomClaimSchema = z.object({
  claimId: z.string().min(1).max(64),
  claimRuleId: z.string().max(80).optional(),
  statement: z.string().min(1).max(400),
  classification: ledgerClaimTypeSchema,
  evidenceIds: z.array(z.string().min(1).max(64)).min(1).max(8),
  confidence: z.enum(["low", "medium", "high"]).optional(),
  qualificationRequired: z.boolean().default(false),
  qualificationText: z.string().max(280).optional(),
  narrativeRole: z.string().max(80).optional(),
});

/** Brief 7.5 claim ledger container. */
export const claimLedgerSchema = z.object({
  claims: z.array(atomClaimSchema).max(24),
  evidenceRefs: z.array(z.string().max(64)).max(32).default([]),
  missingInformation: z.array(z.string().max(400)).max(24).default([]),
  complianceNotes: z.array(z.string().max(400)).max(16).default([]),
  forbiddenClaims: z.array(z.string().max(400)).max(24).default([]),
  mustNotImply: z.array(z.string().max(400)).max(24).default([]),
});

/** @deprecated transitional alias — prefer atomClaimSchema */
export const claimLedgerEntrySchema = atomClaimSchema;

export const distributionContractSchema = z.object({
  intended_channels: z.array(z.string().max(64)).max(8).default([]),
  channel_neutrality: z.boolean().default(true),
  notes: z.string().max(400).optional(),
  requiredInvariants: z.array(z.string().max(400)).max(16).default([]),
  adaptableElements: z.array(z.string().max(400)).max(16).default([]),
  brandVoiceConstraints: z.array(z.string().max(280)).max(12).default([]),
  prohibitedInterpretations: z.array(z.string().max(400)).max(16).default([]),
  mustNotImply: z.array(z.string().max(400)).max(16).default([]),
  ctaIntent: z.string().max(280).optional(),
  ctaBoundaries: z.array(z.string().max(280)).max(12).default([]),
});

export const atomSafetySchema = z.object({
  banned_claims: z.array(z.string()).default([]),
  required_qualifiers: z.array(z.string()).default([]),
  compliance_flags: z.array(z.string()).default([]),
  allowed_evidence_ids: z.array(z.string()).default([]),
});

/**
 * Channel-neutral Content Atom v2 — strategic SSoT.
 * Must not contain platform formatting or provider payloads.
 */
export const contentAtomSchema = z.object({
  schemaVersion: z.literal(CONTENT_ATOM_SCHEMA_VERSION),
  atom_id: z.string().min(1).max(64),
  atom_version: z.number().int().positive(),
  message_hash: z.string().min(1).max(64),

  lineage: atomLineageSchema,
  kernel: atomKernelSchema,
  narrativeModules: narrativeModulesSchema,
  engagementBlueprint: engagementBlueprintSchema,
  claimLedger: claimLedgerSchema,
  distributionContract: distributionContractSchema,

  buildStatus: buildStatusSchema,
  approvalStatus: approvalStatusSchema,

  safety: atomSafetySchema,
  missing_information: z.array(z.string()).default([]),
  measurement_id: z.string().min(1).max(64).optional(),
});

export type ContentAtom = z.infer<typeof contentAtomSchema>;
export type AtomKernel = z.infer<typeof atomKernelSchema>;
export type AtomLineage = z.infer<typeof atomLineageSchema>;
export type HookStrategy = z.infer<typeof hookStrategySchema>;
export type CreativeMode = z.infer<typeof creativeModeSchema>;
export type AtomClaim = z.infer<typeof atomClaimSchema>;
export type ClaimLedger = z.infer<typeof claimLedgerSchema>;
/** @deprecated use AtomClaim */
export type ClaimLedgerEntry = AtomClaim;
export type NarrativeModule = z.infer<typeof narrativeModuleSchema>;
export type EngagementStrategy = z.infer<typeof engagementStrategySchema>;
export type BuildStatus = z.infer<typeof buildStatusSchema>;
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;

/** Specialists (YouTube Short, StrategyLock) after human approval. */
export function isAtomSpecialistReady(atom: ContentAtom): boolean {
  return (
    (atom.buildStatus === "complete" || atom.buildStatus === "limited") &&
    (atom.approvalStatus === "approved" || atom.approvalStatus === "locked")
  );
}

/** UI: build produced a usable (non-hollow) atom. */
export function isAtomBuildSuccessful(atom: ContentAtom): boolean {
  return atom.buildStatus === "complete" || atom.buildStatus === "limited";
}

/**
 * Message identity hash — explicit kernel whitelist (not full JSON dump).
 */
export function computeMessageHash(atom: {
  lineage: Pick<AtomLineage, "masterTitle" | "selectedDirectionId" | "angle">;
  kernel: Pick<
    AtomKernel,
    | "central_claim"
    | "supporting_proof"
    | "belief_shift"
    | "payoff"
    | "intended_action"
    | "hook_strategy"
    | "audience_problem"
    | "core_tension"
    | "resolution"
  >;
}): string {
  const k = atom.kernel;
  return messageHash([
    atom.lineage.masterTitle,
    atom.lineage.selectedDirectionId,
    atom.lineage.angle,
    k.central_claim.claim_id,
    k.central_claim.meaning,
    k.central_claim.canonical_wording,
    k.audience_problem,
    k.core_tension,
    k.resolution,
    ...k.supporting_proof.map((p) => `${p.proof_id}:${p.evidence_id}:${p.meaning}`),
    `${k.belief_shift.from}→${k.belief_shift.to}`,
    k.payoff,
    k.intended_action,
    k.hook_strategy.planted_question,
    k.hook_strategy.opening_intent,
  ]);
}

export {
  beliefShiftHash,
  intendedActionHash,
  payoffHash,
  messageHash,
  stableHash,
} from "./hash";
