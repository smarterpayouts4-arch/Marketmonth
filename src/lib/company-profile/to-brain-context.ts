import { createHash } from "node:crypto";

import type {
  ContentBrainContext,
  ContentEvidence,
  ContentIndexedProduct,
} from "@/brain/content/types";

import type { CompanyProfileProjection } from "./projection.schema";

/** Reject platform/capability phrasing masquerading as indexed products. */
function isSemanticallyValidIndexedName(name: string): boolean {
  if (
    /\b(search|comparison|compare|builder|advisor|filter|filters|console|dashboard|platform|engine|tool|toolkit|sdk|api|app|software|service|faq)\b/i.test(
      name
    )
  ) {
    return false;
  }
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  return tokens.length >= 2 || /^[A-Z0-9][\w-]{2,}$/.test(name.trim());
}

/**
 * Declared indexed products plus any mined from typed evidence rows.
 * Evidence mining never invents a name — it only promotes values already
 * recorded against an `indexedProduct` / `catalogProduct` field.
 */
function mergeIndexedProducts(
  projection: CompanyProfileProjection,
  evidenceById: Record<string, ContentEvidence>
): ContentIndexedProduct[] {
  const out: ContentIndexedProduct[] = [];
  const seen = new Set<string>();

  const push = (product: ContentIndexedProduct) => {
    const key = product.name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(product);
  };

  for (const p of projection.indexedProducts ?? []) {
    push({ name: p.name, price: p.price, sourceUrl: p.sourceUrl });
  }

  for (const ev of Object.values(evidenceById)) {
    if (ev.field !== "indexedProduct" && ev.field !== "catalogProduct") {
      continue;
    }
    const name = ev.value.trim();
    if (!name || name.length > 80) continue;
    if (!isSemanticallyValidIndexedName(name)) continue;
    push({ name, sourceUrl: ev.sourceUrl || undefined });
  }

  return out;
}

/** Projection → ContentBrainContext for Brand Core / topic generation. */
export function projectionToBrainContext(
  projection: CompanyProfileProjection,
  csvTextForVersion?: string
): ContentBrainContext {
  const evidenceById: Record<string, ContentEvidence> = {};
  for (const ev of projection.evidence) {
    // Only evidence + faq are citable (already filtered at parse).
    evidenceById[ev.id] = {
      id: ev.id,
      recordType: ev.recordType,
      field: ev.field,
      value: ev.value,
      sourceUrl: ev.sourceUrl ?? "",
      sourceSnippet: ev.value.slice(0, 180),
      confidence: ev.confidence,
    };
  }

  const indexedProducts = mergeIndexedProducts(projection, evidenceById);

  const contextVersion = createHash("sha256")
    .update(csvTextForVersion ?? projection.artifactHash ?? projection.companyId)
    .digest("hex")
    .slice(0, 16);

  return {
    brandName: projection.businessName,
    domain: projection.companyId,
    website: projection.website,
    description: projection.description?.value,
    audience: projection.audience?.value,
    products: projection.products,
    services: projection.services,
    indexedProducts,
    valueProposition: projection.valueProposition?.value,
    brandVoice: projection.brandVoice?.value,
    marketingOpportunity: projection.marketingOpportunity?.value,
    contentOpportunities: projection.contentOpportunities,
    evidenceById,
    contextVersion,
    source: "fixture",
  };
}
