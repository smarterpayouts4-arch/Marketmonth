import { createHash } from "node:crypto";

import type { ContentBrainContext, ContentEvidence } from "@/brain/content/types";

import {
  brandCoreSchema,
  type BrandCore,
  type BrandCoreSlice,
  type BrandProofItem,
} from "./brand-core.schema";

const PROOF_LIBRARY_MAX = 32;

function isIndustryResearchEvidence(ev: ContentEvidence): boolean {
  const type = (ev.evidenceType ?? "").toLowerCase();
  const notes = (ev.notes ?? "").toLowerCase();
  return (
    type === "industry_research" ||
    notes.includes("industry_research") ||
    (type === "recommended" && notes.includes("perplexity"))
  );
}

function proofPriority(ev: ContentEvidence): number {
  const field = ev.field.toLowerCase();
  if (field === "faq") return 0;
  if (field === "catalogproduct" || field === "catalogproducts") return 1;
  if (field === "customerproblems" || field === "positioning") return 2;
  if (ev.recordType === "evidence") return 3;
  return 4;
}

function selectProofEvidence(
  evidenceById: Record<string, ContentEvidence>
): ContentEvidence[] {
  return Object.values(evidenceById)
    .filter((ev) => !isIndustryResearchEvidence(ev))
    .filter((ev) => ev.value.trim().length > 0)
    .sort((a, b) => {
      const pd = proofPriority(a) - proofPriority(b);
      if (pd !== 0) return pd;
      return a.id.localeCompare(b.id);
    })
    .slice(0, PROOF_LIBRARY_MAX);
}

/**
 * Compile stored Brand Core from Content Brain context (fixture/discovery).
 * Pure function — no AI.
 *
 * Catalog products and FAQ evidence are first-class inputs (not only platform products[]).
 * Industry-research / Perplexity-tagged evidence is excluded from proof_library.
 */
export function compileBrandCore(context: ContentBrainContext): BrandCore {
  const proof_library: BrandProofItem[] = selectProofEvidence(
    context.evidenceById
  ).map((ev) => ({
    proof_id: ev.id,
    type: mapProofType(ev.recordType, ev.field),
    summary: clamp(ev.value, 400),
    source_ref: ev.sourceUrl || undefined,
  }));

  const platformOffers = [
    ...context.products.map((p) => clamp(p, 160)),
    ...context.services.map((s) => clamp(s, 160)),
  ].filter(Boolean);

  const catalogOffers = (context.catalogProducts ?? [])
    .map((p) => clamp(p.name, 160))
    .filter(Boolean);

  // Platform capabilities first, then catalog SKUs (deduped, case-insensitive)
  const seen = new Set<string>();
  const offers: string[] = [];
  for (const name of [...platformOffers, ...catalogOffers]) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    offers.push(name);
    if (offers.length >= 24) break;
  }

  const core: BrandCore = {
    version: `bc_${context.contextVersion}`,
    brand_name: context.brandName,
    domain: context.domain,
    website: context.website,
    audience: {
      primary:
        context.audience?.trim() ||
        "Decision-makers evaluating clearer marketing systems",
      segments: [
        {
          segment_id: "seg_primary",
          label: "Primary audience",
          description: context.audience?.trim(),
        },
      ],
    },
    positioning: clamp(
      context.valueProposition?.trim() ||
        context.description?.trim() ||
        `${context.brandName} helps teams make clearer marketing decisions`,
      600
    ),
    voice: clamp(
      context.brandVoice?.trim() || "Clear, practical, authoritative but warm",
      400
    ),
    offers:
      offers.length > 0
        ? offers
        : [clamp(context.marketingOpportunity || "Lead offer", 160)],
    proof_library,
    banned_claims: [
      "guaranteed results",
      "overnight success",
      "guaranteed ROI",
      "works for everyone",
    ],
    visual_identity: {
      style_notes:
        "Clean product-led visuals; prefer real product or clear metaphor over generic stock clutter",
      avoid: ["clickbait faces", "unreadable dense text overlays"],
    },
    psychology_principles: [
      "Plant a relevant question before closing the loop",
      "Provide first-frame context so viewers know who this is for",
      "Deliver the promised payoff inside the asset",
      "Prefer belief-challenge and curiosity over empty hype",
    ],
    cta_rules: {
      preferred_actions: ["save", "comment", "visit_site", "book_call", "follow"],
      avoid: ["guaranteed outcomes", "fear-mongering urgency"],
    },
  };

  return brandCoreSchema.parse(core);
}

/** Lean slice for Core Content Brain / adapter prompts. */
export function toBrandCoreSlice(core: BrandCore): BrandCoreSlice {
  return {
    version: core.version,
    brand_name: core.brand_name,
    domain: core.domain,
    audience_primary: core.audience.primary,
    positioning: core.positioning,
    voice: core.voice,
    offers: core.offers.slice(0, 8),
    proof_library: core.proof_library.slice(0, 8),
    banned_claims: core.banned_claims.slice(0, 16),
    psychology_principles: core.psychology_principles.slice(0, 8),
    cta_preferred_actions: core.cta_rules.preferred_actions.slice(0, 8),
    visual_style_notes: core.visual_identity.style_notes,
  };
}

export function brandCoreContentHash(core: BrandCore): string {
  return createHash("sha256")
    .update(JSON.stringify(core))
    .digest("hex")
    .slice(0, 16);
}

function mapProofType(
  recordType: string,
  field: string
): BrandProofItem["type"] {
  const key = `${recordType}:${field}`.toLowerCase();
  if (key.includes("testimonial") || key.includes("quote")) return "quote";
  if (key.includes("metric") || key.includes("stat")) return "metric";
  if (key.includes("case")) return "case_study";
  return "fact";
}

function clamp(value: string, max: number): string {
  const t = value.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}
