import { z } from "zod";

import { messageHash } from "./hash";

export const claimTypeSchema = z.enum([
  "fact",
  "opinion",
  "experience",
  "prediction",
]);

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

export const atomStatusSchema = z.enum(["validating", "ready", "invalid"]);

export const contentDirectionEmbedSchema = z.object({
  direction_id: z.string().min(1).max(64),
  specific_topic: z.string().min(1).max(280),
  editorial_angle: z.string().min(1).max(160),
  audience_problem: z.string().min(1).max(400),
  core_promise: z.string().min(1).max(280),
  suggested_creative_mode: z.string().min(1).max(80),
});

export const hookStrategySchema = z.object({
  family: hookFamilySchema,
  planted_question: z.string().min(1).max(200),
  withheld_information: z.string().max(200).optional(),
  resolution: z.string().min(1).max(280),
  opening_intent: z.string().min(1).max(280),
});

export const centralClaimSchema = z.object({
  claim_id: z.string().min(1).max(64),
  meaning: z.string().min(1).max(280),
  canonical_wording: z.string().min(1).max(280),
  claim_type: claimTypeSchema,
});

export const supportingProofSchema = z.object({
  proof_id: z.string().min(1).max(64),
  meaning: z.string().min(1).max(400),
  evidence_id: z.string().min(1).max(64),
});

/**
 * Channel-neutral Content Atom — strategic SSoT.
 * Must not contain platform formatting or provider payloads.
 */
export const contentAtomSchema = z.object({
  atom_id: z.string().min(1).max(64),
  atom_version: z.number().int().positive(),
  message_hash: z.string().min(1).max(64),

  master_topic: z.string().min(1).max(280),
  selected_direction: contentDirectionEmbedSchema,

  audience: z.object({
    state: z.string().min(1).max(400),
    problem: z.string().min(1).max(400),
    core_tension: z.string().min(1).max(280),
  }),

  hook_strategy: hookStrategySchema,

  central_claim: centralClaimSchema,
  supporting_proof: z.array(supportingProofSchema).min(1).max(12),

  desired_belief_shift: z.object({
    from: z.string().min(1).max(200),
    to: z.string().min(1).max(200),
  }),

  narrative: z.object({
    setup: z.string().min(1).max(400),
    development: z.array(z.string().min(1).max(400)).min(1).max(8),
    payoff: z.string().min(1).max(400),
  }),

  promised_payoff: z.string().min(1).max(280),
  intended_action: z.string().min(1).max(120),

  creative_mode: creativeModeSchema,
  visual_concept: z.string().min(1).max(400),

  safety: z.object({
    banned_claims: z.array(z.string()).default([]),
    required_qualifiers: z.array(z.string()).default([]),
    compliance_flags: z.array(z.string()).default([]),
  }),

  brand_core_id: z.string().min(1).max(64),
  brand_core_version: z.union([z.string().min(1).max(64), z.number()]),

  status: atomStatusSchema,

  /** Trace / experiment id */
  measurement_id: z.string().min(1).max(64).optional(),
});

export type ContentAtom = z.infer<typeof contentAtomSchema>;
export type HookStrategy = z.infer<typeof hookStrategySchema>;
export type CreativeMode = z.infer<typeof creativeModeSchema>;
export type ContentDirectionEmbed = z.infer<typeof contentDirectionEmbedSchema>;

export function computeMessageHash(atom: {
  master_topic: string;
  central_claim: { claim_id: string; meaning: string; canonical_wording: string };
  supporting_proof: Array<{ proof_id: string; meaning: string }>;
  desired_belief_shift: { from: string; to: string };
  promised_payoff: string;
  intended_action: string;
  hook_strategy: { planted_question: string; opening_intent: string };
}): string {
  return messageHash([
    atom.master_topic,
    atom.central_claim.claim_id,
    atom.central_claim.meaning,
    atom.central_claim.canonical_wording,
    ...atom.supporting_proof.map((p) => `${p.proof_id}:${p.meaning}`),
    `${atom.desired_belief_shift.from}→${atom.desired_belief_shift.to}`,
    atom.promised_payoff,
    atom.intended_action,
    atom.hook_strategy.planted_question,
    atom.hook_strategy.opening_intent,
  ]);
}

export {
  beliefShiftHash,
  intendedActionHash,
  payoffHash,
  messageHash,
  stableHash,
} from "./hash";
