/**
 * UI-safe grounded discovery activation contract.
 * Engine builds this; presentation formats it — never invents options.
 */
import { z } from "zod";

export const activationConfidenceSchema = z.enum(["high", "medium", "low"]);
export type ActivationConfidence = z.infer<typeof activationConfidenceSchema>;

export const activationEvidenceSchema = z.object({
  text: z.string().min(1),
  kind: z.enum(["observed", "interpreted", "recommended"]),
  confidence: activationConfidenceSchema.optional(),
  sourceUrl: z.string().url().optional(),
});
export type ActivationEvidence = z.infer<typeof activationEvidenceSchema>;

export const discoveryOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  explanation: z.string().min(1),
  evidence: z.array(activationEvidenceSchema),
  confidence: activationConfidenceSchema,
  recommended: z.boolean().optional(),
  /** Maps investment → strategy goal when this growth option is selected. */
  strategyGoal: z
    .enum(["awareness", "leads", "sales", "loyalty"])
    .optional(),
});
export type DiscoveryOption = z.infer<typeof discoveryOptionSchema>;

export const discoveryActivationProfileSchema = z.object({
  brandCore: z.object({
    insight: z.string(),
    evidence: z.array(activationEvidenceSchema),
    confidence: activationConfidenceSchema,
    clarification: z.string().optional(),
  }),
  buyerTensions: z.array(discoveryOptionSchema),
  leadOffers: z.array(discoveryOptionSchema),
  growthDirections: z.array(discoveryOptionSchema),
  evidenceQuality: z.enum(["strong", "moderate", "low"]),
});
export type DiscoveryActivationProfile = z.infer<
  typeof discoveryActivationProfileSchema
>;
