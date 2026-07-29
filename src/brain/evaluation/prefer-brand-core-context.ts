import type { ContentBrainContext, ContentEvidence } from "@/brain/content/types";
import type { BrandCore } from "@/brain/core/brand-core.schema";

/**
 * Prefer Brand Core indexed products + FAQ proofs as primary Idea Lab topic inputs.
 * Indexed products stay out of company offers.
 */
export function preferBrandCoreForTopics(
  context: ContentBrainContext,
  brandCore: BrandCore
): ContentBrainContext {
  const evidenceById: Record<string, ContentEvidence> = {
    ...context.evidenceById,
  };

  for (const proof of brandCore.proof_library) {
    if (proof.type !== "faq") continue;
    const id = proof.proof_id || `brandcore-faq-${proof.summary.slice(0, 24)}`;
    if (evidenceById[id]) continue;
    evidenceById[id] = {
      id,
      field: "faq",
      value: proof.summary,
      confidence: "high",
      sourceUrl: proof.source_ref ?? "",
      sourceSnippet: proof.summary.slice(0, 160),
      recordType: "evidence",
      evidenceType: "observed",
      notes: "brand_core_proof_library",
    };
  }

  const fromCore = (brandCore.indexed_products ?? []).map((p) => ({
    name: p.name,
    sourceUrl: p.source_url ?? context.website ?? context.domain,
  }));

  const existing = new Map(
    [...fromCore, ...(context.indexedProducts ?? [])].map((p) => [
      p.name.toLowerCase(),
      p,
    ])
  );

  return {
    ...context,
    evidenceById,
    products: brandCore.platform_capabilities?.length
      ? [...brandCore.platform_capabilities]
      : context.products,
    services: brandCore.services?.length
      ? [...brandCore.services]
      : context.services,
    indexedProducts: [...existing.values()],
  };
}
