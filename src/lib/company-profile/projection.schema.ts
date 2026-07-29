import { z } from "zod";

/** True CSV evidence_type for brand_profile scalar fields (not collapsed). */
export const fieldEvidenceTypeSchema = z.enum([
  "observed",
  "inferred",
  "recommended",
]);

/**
 * @deprecated Use fieldEvidenceTypeSchema — kept for import compatibility.
 * Maps legacy "derived" → "inferred".
 */
export const fieldProvenanceSchema = z
  .enum(["observed", "inferred", "recommended", "derived"])
  .transform((v) => (v === "derived" ? "inferred" : v));

export const projectedFieldSchema = z.object({
  value: z.string(),
  /** Canonical 3-way classification from the CSV evidence_type column. */
  evidenceType: fieldEvidenceTypeSchema,
  /**
   * @deprecated Prefer evidenceType. Accepted for older call sites; normalized
   * to evidenceType by parseCompanyCsv.
   */
  provenance: fieldEvidenceTypeSchema.optional(),
  sourceUrl: z.string().optional(),
});

export const projectionFaqSchema = z.object({
  question: z.string(),
  answer: z.string(),
  sourceUrl: z.string().optional(),
});

export const projectionOfferSchema = z.object({
  label: z.string(),
  sourceUrl: z.string().optional(),
});

export const projectionEvidenceSchema = z.object({
  id: z.string(),
  field: z.string(),
  value: z.string(),
  kind: z.string(),
  confidence: z.enum(["high", "medium", "low"]).catch("low"),
  sourceUrl: z.string().optional(),
  sourcePageType: z.string().optional(),
  recordType: z.enum(["evidence", "faq"]),
});

export const projectionSignalsSchema = z.object({
  title: z.string().default(""),
  metaDescription: z.string().default(""),
  headings: z.array(z.string()).default([]),
  ctaTexts: z.array(z.string()).default([]),
  productText: z.string().default(""),
  aboutText: z.string().default(""),
  bodySample: z.string().default(""),
  testimonialText: z.string().default(""),
  colors: z.array(z.string()).default([]),
  contactEmails: z.array(z.string()).default([]),
  contactPhones: z.array(z.string()).default([]),
  logoUrl: z.string().optional(),
  locationHints: z.array(z.string()).default([]),
  organization: z
    .object({
      name: z.string().optional(),
      legalName: z.string().optional(),
      sameAs: z.array(z.string()).default([]),
      sourceUrl: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export const projectionCrawlMetaSchema = z.object({
  pageCount: z.number().int().nonnegative().optional(),
  fetchAttempts: z.number().int().nonnegative().optional(),
  failedUrls: z.array(z.string()).default([]),
  pageKinds: z.array(z.string()).default([]),
  collectionMethods: z.array(z.string()).default([]),
  acceptanceGate: z.string().optional(),
  detectedLocations: z
    .array(
      z.object({
        value: z.string(),
        sourceUrl: z.string().optional(),
        confidence: z.string().optional(),
      })
    )
    .default([]),
});

export const companyProfileProjectionSchema = z.object({
  companyId: z.string().min(1),
  schemaVersion: z.literal("2.0"),
  artifactHash: z.string().optional(),
  website: z.string().min(1),
  businessName: z.string().min(1),
  description: projectedFieldSchema.optional(),
  audience: projectedFieldSchema.optional(),
  valueProposition: projectedFieldSchema.optional(),
  brandVoice: projectedFieldSchema.optional(),
  marketingOpportunity: projectedFieldSchema.optional(),
  products: z.array(z.string()).default([]),
  services: z.array(z.string()).default([]),
  indexedProducts: z
    .array(
      z.object({
        name: z.string(),
        price: z.string().optional(),
        sourceUrl: z.string().optional(),
      })
    )
    .default([]),
  colors: z.array(z.string()).default([]),
  socialProfiles: z.array(z.unknown()).default([]),
  competitors: z.array(z.unknown()).default([]),
  contentOpportunities: z.array(z.string()).default([]),
  seo: z
    .object({
      metadataCompleteness: z.string().optional(),
      pageSpeedNote: z.string().optional(),
      technicalObservations: z.array(z.string()).default([]),
    })
    .optional(),
  signals: projectionSignalsSchema,
  faqs: z.array(projectionFaqSchema).default([]),
  offers: z.array(projectionOfferSchema).default([]),
  crawlMeta: projectionCrawlMetaSchema.default({
    failedUrls: [],
    pageKinds: [],
    collectionMethods: [],
    detectedLocations: [],
  }),
  evidence: z.array(projectionEvidenceSchema).default([]),
  derivedFieldNames: z.array(z.string()).default([]),
});

export type FieldEvidenceType = z.infer<typeof fieldEvidenceTypeSchema>;
/** @deprecated Use FieldEvidenceType */
export type FieldProvenance = FieldEvidenceType;
export type ProjectedField = z.infer<typeof projectedFieldSchema>;
export type CompanyProfileProjection = z.infer<
  typeof companyProfileProjectionSchema
>;
export type ProjectionFaq = z.infer<typeof projectionFaqSchema>;
export type ProjectionOffer = z.infer<typeof projectionOfferSchema>;
export type ProjectionEvidence = z.infer<typeof projectionEvidenceSchema>;
