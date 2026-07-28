import { z } from "zod";

/**
 * Controlled Brand Core view for Directions intelligence.
 * Built only from canonical Brand Core (+ identity) — never raw CSV / Discovery.
 */

export const directionsSliceEvidenceSchema = z.object({
  evidence_id: z.string().min(1),
  meaning: z.string().min(1).max(400),
  source: z.string().max(400),
  order: z.number().int().nonnegative(),
});

export const directionsSliceClaimSchema = z.object({
  claim_id: z.string().min(1),
  wording: z.string().min(1).max(600),
  /** Evidence IDs the model may attach when using this claim. Empty = no evidence attach. */
  allowed_evidence_ids: z.array(z.string()).max(24),
  order: z.number().int().nonnegative(),
});

export const directionsSliceProblemSchema = z.object({
  problem_id: z.string().min(1),
  description: z.string().min(1).max(400),
  order: z.number().int().nonnegative(),
});

export const directionsSliceAudienceSchema = z.object({
  audience_id: z.string().min(1),
  description: z.string().min(1).max(400),
  problems: z.array(directionsSliceProblemSchema).min(1).max(12),
  order: z.number().int().nonnegative(),
});

export const directionsSliceOfferSchema = z.object({
  offer_id: z.string().min(1),
  name: z.string().min(1).max(160),
  description: z.string().min(1).max(400),
  order: z.number().int().nonnegative(),
});

export const directionsBrandCoreSliceSchema = z.object({
  company: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    positioning: z.string().min(1).max(600),
  }),
  brand_core_id: z.string().min(1),
  brand_core_version: z.number().int().nonnegative(),
  brand_core_hash: z.string().min(1),
  audiences: z.array(directionsSliceAudienceSchema).min(1).max(8),
  offers: z.array(directionsSliceOfferSchema).min(1).max(24),
  claims: z.array(directionsSliceClaimSchema).min(1).max(24),
  evidence: z.array(directionsSliceEvidenceSchema).max(48),
  safety: z.object({
    banned_claims: z.array(z.string()).max(48),
    required_qualifiers: z.array(z.string()).max(48),
  }),
});

export type DirectionsBrandCoreSlice = z.infer<
  typeof directionsBrandCoreSliceSchema
>;
