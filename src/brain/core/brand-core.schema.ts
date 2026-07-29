import { z } from "zod";

/**
 * Brand Core — stored brand governance data, not an AI agent.
 * Every AI step receives a relevant slice, not a full dump.
 */
export const brandProofItemSchema = z.object({
  proof_id: z.string().min(1).max(64),
  type: z.enum(["case_study", "quote", "metric", "fact", "testimonial", "faq"]),
  summary: z.string().min(1).max(400),
  source_ref: z.string().max(200).optional(),
});

/** Third-party products the brand indexes/compares — never company inventory. */
export const indexedProductCoreSchema = z.object({
  name: z.string().min(1).max(160),
  source_url: z.string().max(400).optional(),
  relationship: z
    .enum(["indexed", "compared", "researched", "referenced"])
    .default("indexed"),
});

export const brandCoreSchema = z.object({
  version: z.string().min(1).max(64),
  brand_name: z.string().min(1).max(120),
  domain: z.string().min(1).max(200),
  website: z.string().min(1).max(400),
  audience: z.object({
    primary: z.string().min(1).max(400),
    segments: z
      .array(
        z.object({
          segment_id: z.string().min(1).max(64),
          label: z.string().min(1).max(120),
          description: z.string().max(400).optional(),
        })
      )
      .max(12),
  }),
  positioning: z.string().min(1).max(600),
  voice: z.string().min(1).max(400),
  /** Company offerings only (platform tools + services) — not indexed third-party products. */
  offers: z.array(z.string().min(1).max(160)).min(1).max(24),
  platform_capabilities: z.array(z.string().min(1).max(160)).max(24).default([]),
  services: z.array(z.string().min(1).max(160)).max(24).default([]),
  indexed_products: z.array(indexedProductCoreSchema).max(48).default([]),
  market_subjects: z.array(z.string().min(1).max(160)).max(48).default([]),
  proof_library: z.array(brandProofItemSchema).max(48),
  banned_claims: z.array(z.string().min(1).max(200)).max(48),
  visual_identity: z.object({
    style_notes: z.string().max(400),
    color_guidance: z.string().max(200).optional(),
    avoid: z.array(z.string().max(120)).max(16).optional(),
  }),
  psychology_principles: z.array(z.string().min(1).max(240)).max(16),
  cta_rules: z.object({
    preferred_actions: z.array(z.string().min(1).max(80)).min(1).max(12),
    avoid: z.array(z.string().max(120)).max(12).optional(),
  }),
});

export type BrandCore = z.infer<typeof brandCoreSchema>;
export type BrandProofItem = z.infer<typeof brandProofItemSchema>;

/** Compact slice passed into AI calls (context hygiene). */
export const brandCoreSliceSchema = z.object({
  version: z.string(),
  brand_name: z.string(),
  domain: z.string(),
  audience_primary: z.string(),
  positioning: z.string(),
  voice: z.string(),
  offers: z.array(z.string()).max(8),
  proof_library: z.array(brandProofItemSchema).max(8),
  banned_claims: z.array(z.string()).max(16),
  psychology_principles: z.array(z.string()).max(8),
  cta_preferred_actions: z.array(z.string()).max(8),
  visual_style_notes: z.string().max(400),
});

export type BrandCoreSlice = z.infer<typeof brandCoreSliceSchema>;
