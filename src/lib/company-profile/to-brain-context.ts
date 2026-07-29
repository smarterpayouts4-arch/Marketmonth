import { createHash } from "node:crypto";

import type {
  ContentBrainContext,
  ContentBrandSignals,
  ContentEvidence,
  ContentIndexedProduct,
} from "@/brain/content/types";
import { audienceLineForContext } from "@/brain/content/audience-label";

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

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]{2,}/g;
const PHONE_RE =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

/**
 * Evidence fields that exist only to carry contact details. They cannot inform
 * which topic to write about, so they are dropped rather than redacted.
 */
const CONTACT_FIELD_RE =
  /^(?:contact)?(?:email|phone|tel|telephone|fax|address|mailingAddress)$/i;

/**
 * Redact contact details that appear inside free-text signals.
 *
 * Dropping the `contactEmails` and `contactPhones` arrays is not sufficient:
 * `aboutText` is assembled from whole page bodies, so a footer address arrives
 * glued into the prose (`business@example.comPhone`). Without this, contact
 * details would reach a model prompt.
 */
function scrubInlineContacts(text: string): string {
  return text.replace(EMAIL_RE, "[email]").replace(PHONE_RE, "[phone]");
}

/**
 * Crawl signals minus every PII-bearing field.
 *
 * `contactEmails`, `contactPhones`, `locationHints`, `colors`, `logoUrl`, and
 * `organization` are dropped wholesale: the first three are personal data and
 * none of the six can influence which topic to write about. Remaining free text
 * is scrubbed because contact details also appear inline.
 */
function piiFreeSignals(
  projection: CompanyProfileProjection
): ContentBrandSignals {
  const s = projection.signals;
  return {
    headings: s.headings.map(scrubInlineContacts),
    ctaTexts: s.ctaTexts.map(scrubInlineContacts),
    productText: scrubInlineContacts(s.productText),
    aboutText: scrubInlineContacts(s.aboutText),
    bodySample: scrubInlineContacts(s.bodySample),
    testimonialText: scrubInlineContacts(s.testimonialText),
  };
}

/** Projection → ContentBrainContext for Brand Core / topic generation. */
export function projectionToBrainContext(
  projection: CompanyProfileProjection,
  csvTextForVersion?: string
): ContentBrainContext {
  const evidenceById: Record<string, ContentEvidence> = {};
  for (const ev of projection.evidence) {
    if (CONTACT_FIELD_RE.test(ev.field)) continue;
    // Only evidence + faq are citable (already filtered at parse).
    const value = scrubInlineContacts(ev.value);
    evidenceById[ev.id] = {
      id: ev.id,
      recordType: ev.recordType,
      field: ev.field,
      value,
      sourceUrl: ev.sourceUrl ?? "",
      sourceSnippet: value.slice(0, 180),
      confidence: ev.confidence,
      // Observed vs inferred vs recommended. Without this the brain cannot tell
      // a fact read off the site from a guess, and scores them identically.
      evidenceType: ev.kind,
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
    audience: audienceLineForContext({
      audience: projection.audience?.value,
      brandName: projection.businessName,
    }),
    products: projection.products,
    services: projection.services,
    indexedProducts,
    valueProposition: projection.valueProposition?.value,
    brandVoice: projection.brandVoice?.value,
    marketingOpportunity: projection.marketingOpportunity?.value,
    contentOpportunities: projection.contentOpportunities,
    faqs: projection.faqs.map((f) => ({
      question: scrubInlineContacts(f.question),
      answer: scrubInlineContacts(f.answer),
      sourceUrl: f.sourceUrl,
    })),
    commercialTerms: projection.offers.map((o) => ({
      label: o.label,
      sourceUrl: o.sourceUrl,
    })),
    signals: piiFreeSignals(projection),
    evidenceById,
    contextVersion,
    source: "fixture",
  };
}
