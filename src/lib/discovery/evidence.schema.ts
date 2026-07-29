import { z } from "zod";

export const evidenceKindSchema = z.enum([
  "observed",
  "inferred",
  "user_confirmed",
  "recommended",
]);

export const evidenceConfidenceSchema = z.enum(["high", "medium", "low"]);

export const discoveryEvidenceSchema = z.object({
  id: z.string().min(1),
  field: z.string().min(1),
  kind: evidenceKindSchema,
  value: z.string().min(1),
  sourceUrl: z.string().optional(),
  sourcePageType: z.string().optional(),
  confidence: evidenceConfidenceSchema,
});

export type EvidenceKind = z.infer<typeof evidenceKindSchema>;
export type EvidenceConfidence = z.infer<typeof evidenceConfidenceSchema>;
export type DiscoveryEvidence = z.infer<typeof discoveryEvidenceSchema>;

export const crawlMetaSchema = z.object({
  pageCount: z.number().int().nonnegative(),
  kinds: z.array(z.string()),
  collectionMethods: z.array(z.enum(["fetch", "playwright"])).optional(),
  pageSummaries: z
    .array(
      z.object({
        url: z.string(),
        pageType: z.string(),
        title: z.string().optional(),
        collectionMethod: z.enum(["fetch", "playwright"]),
      })
    )
    .optional(),
  detectedLocations: z
    .array(
      z.object({
        formattedAddress: z.string().optional(),
        city: z.string().optional(),
        region: z.string().optional(),
        country: z.string().optional(),
        sourceUrl: z.string(),
        confidence: z.enum(["high", "medium", "low"]),
      })
    )
    .optional(),
  /** URLs that failed after retries. */
  failedUrls: z.array(z.string()).optional(),
  fetchAttempts: z.number().int().nonnegative().optional(),
  extraPageFailures: z
    .array(z.object({ url: z.string(), reason: z.string() }))
    .optional(),
  /** Discovery CSV schema version expected at materialize time. */
  csvSchemaVersion: z.string().optional(),
  acceptanceGate: z
    .object({
      status: z.string(),
      accepted: z.boolean(),
      approvalReady: z.boolean(),
      failures: z.array(z.string()).optional(),
    })
    .optional(),
});

export type CrawlMeta = z.infer<typeof crawlMetaSchema>;
