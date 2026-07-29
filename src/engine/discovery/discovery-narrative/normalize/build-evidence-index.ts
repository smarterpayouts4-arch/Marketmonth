import { createHash } from "node:crypto";

import type {
  DiscoveryClassification,
  DiscoveryConfidence,
} from "@/lib/discovery/discovery-narrative.schema";
import type { CompanyProfileProjection } from "@/lib/company-profile/projection.schema";

import type { EvidenceItem, EvidenceRecordType } from "../types";
import { deglueText } from "./deglue";
import { deduplicateEvidence } from "./dedupe-and-prefer-complete";
import { scoreEvidence } from "./score-evidence";
import {
  normalizeWhitespace,
  sanitizeEvidenceText,
  shouldRejectEvidenceText,
} from "./sanitize";

function stableId(
  recordType: EvidenceRecordType,
  field: string,
  value: string,
  sourceUrl: string
): string {
  return createHash("sha1")
    .update(`${recordType}|${field}|${value}|${sourceUrl}`)
    .digest("hex")
    .slice(0, 16);
}

function asClassification(raw: string | undefined): DiscoveryClassification {
  const t = (raw ?? "").toLowerCase();
  if (t === "observed") return "observed";
  if (t === "recommended") return "recommended";
  return "inferred";
}

function asConfidence(raw: string | undefined): DiscoveryConfidence {
  const t = (raw ?? "").toLowerCase();
  if (t === "high") return "high";
  if (t === "low") return "low";
  return "medium";
}

function pushTextItem(
  out: EvidenceItem[],
  input: {
    recordType: EvidenceRecordType;
    field: string;
    value: unknown;
    text: string;
    sourceUrl: string;
    evidenceType: DiscoveryClassification;
    confidence: DiscoveryConfidence;
    sourceSnippet?: string;
  }
) {
  const sanitized = sanitizeEvidenceText(input.text);
  if (!sanitized) return;
  if (shouldRejectEvidenceText(sanitized)) return;

  const evidenceType = input.evidenceType;
  const confidence = input.confidence;
  out.push({
    id: stableId(input.recordType, input.field, sanitized, input.sourceUrl),
    recordType: input.recordType,
    field: input.field,
    value: input.value,
    normalizedText: sanitized,
    sourceUrl: input.sourceUrl || "",
    evidenceType,
    confidence,
    sourceSnippet: input.sourceSnippet
      ? normalizeWhitespace(input.sourceSnippet).slice(0, 180)
      : undefined,
    qualityScore: scoreEvidence(evidenceType, confidence),
  });
}

function parseJsonLike(value: string): unknown {
  const t = value.trim();
  if (!t) return null;
  if (!(t.startsWith("[") || t.startsWith("{"))) return t;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

function flattenStructuredValue(
  out: EvidenceItem[],
  field: string,
  raw: unknown,
  sourceUrl: string,
  evidenceType: DiscoveryClassification,
  confidence: DiscoveryConfidence,
  recordType: EvidenceRecordType
) {
  if (raw == null) return;
  if (typeof raw === "string") {
    const parsed = parseJsonLike(raw);
    if (typeof parsed === "string") {
      pushTextItem(out, {
        recordType,
        field,
        value: raw,
        text: parsed,
        sourceUrl,
        evidenceType,
        confidence,
      });
      return;
    }
    flattenStructuredValue(
      out,
      field,
      parsed,
      sourceUrl,
      evidenceType,
      confidence,
      recordType
    );
    return;
  }
  if (Array.isArray(raw)) {
    if (raw.length === 0) return;
    for (const item of raw) {
      if (typeof item === "string") {
        pushTextItem(out, {
          recordType,
          field,
          value: item,
          text: item,
          sourceUrl,
          evidenceType,
          confidence,
        });
      } else if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const name =
          (typeof obj.name === "string" && obj.name) ||
          (typeof obj.label === "string" && obj.label) ||
          (typeof obj.platform === "string" && obj.platform) ||
          (typeof obj.question === "string" && obj.question) ||
          null;
        const status = typeof obj.status === "string" ? obj.status : undefined;
        const url =
          (typeof obj.sourceUrl === "string" && obj.sourceUrl) ||
          (typeof obj.url === "string" && obj.url) ||
          (typeof obj.website === "string" && obj.website) ||
          sourceUrl;
        if (name) {
          const text =
            status != null ? `${name} (${status})` : String(name);
          pushTextItem(out, {
            recordType,
            field,
            value: item,
            text,
            sourceUrl: url,
            evidenceType,
            confidence,
          });
        }
        if (typeof obj.answer === "string" && typeof obj.question === "string") {
          pushTextItem(out, {
            recordType: "faq",
            field: "entry",
            value: item,
            text: `Q: ${obj.question} A: ${obj.answer}`,
            sourceUrl: url,
            evidenceType,
            confidence,
          });
        }
      }
    }
    return;
  }
  if (typeof raw === "object") {
    // Skip opaque objects without a readable name
    return;
  }
}

/**
 * Flatten a CompanyProfileProjection into scored EvidenceItem[].
 * Prefer complete observed evidence over clipped brand_profile summaries
 * (handled in dedupe step).
 */
export function buildEvidenceIndex(
  projection: CompanyProfileProjection
): EvidenceItem[] {
  const out: EvidenceItem[] = [];
  const website = projection.website || "";

  const scalarFields: Array<{
    field: string;
    value?: { value: string; evidenceType?: string; provenance?: string; sourceUrl?: string };
  }> = [
    { field: "description", value: projection.description },
    { field: "audience", value: projection.audience },
    { field: "valueProposition", value: projection.valueProposition },
    { field: "brandVoice", value: projection.brandVoice },
    { field: "marketingOpportunity", value: projection.marketingOpportunity },
  ];

  for (const { field, value } of scalarFields) {
    if (!value?.value?.trim()) continue;
    pushTextItem(out, {
      recordType: "brand_profile",
      field,
      value: value.value,
      text: value.value,
      sourceUrl: value.sourceUrl || website,
      evidenceType: asClassification(value.evidenceType ?? value.provenance),
      confidence: "medium",
    });
  }

  pushTextItem(out, {
    recordType: "brand_profile",
    field: "businessName",
    value: projection.businessName,
    text: projection.businessName,
    sourceUrl: website,
    evidenceType: "observed",
    confidence: "high",
  });

  flattenStructuredValue(
    out,
    "products",
    projection.products,
    website,
    "inferred",
    "medium",
    "brand_profile"
  );
  flattenStructuredValue(
    out,
    "services",
    projection.services,
    website,
    "inferred",
    "medium",
    "brand_profile"
  );
  flattenStructuredValue(
    out,
    "indexedProducts",
    projection.indexedProducts,
    website,
    "observed",
    "high",
    "brand_profile"
  );
  flattenStructuredValue(
    out,
    "socialProfiles",
    projection.socialProfiles,
    website,
    "observed",
    "high",
    "brand_profile"
  );
  flattenStructuredValue(
    out,
    "seo.contentOpportunities",
    projection.contentOpportunities,
    website,
    "recommended",
    "medium",
    "brand_profile"
  );

  // Skip low-confidence competitor suggestions as facts
  for (const c of projection.competitors) {
    if (!c || typeof c !== "object") continue;
    const obj = c as { name?: string; reason?: string; website?: string };
    if (!obj.name) continue;
    pushTextItem(out, {
      recordType: "brand_profile",
      field: "competitors",
      value: c,
      text: obj.reason ? `${obj.name}: ${obj.reason}` : obj.name,
      sourceUrl: obj.website || website,
      evidenceType: "inferred",
      confidence: "low",
    });
  }

  for (const ev of projection.evidence) {
    // Contact/legal noise — keep out of narrative unless relevant later
    if (
      /^(contactEmail|contactPhone|legalName|businessAddress|logoUrl)$/i.test(
        ev.field
      )
    ) {
      continue;
    }
    pushTextItem(out, {
      recordType: ev.recordType === "faq" ? "faq" : "evidence",
      field: ev.field,
      value: ev.value,
      text: ev.value,
      sourceUrl: ev.sourceUrl || website,
      evidenceType: asClassification(ev.kind),
      confidence: asConfidence(ev.confidence),
      sourceSnippet: ev.value,
    });
  }

  for (const faq of projection.faqs) {
    pushTextItem(out, {
      recordType: "faq",
      field: "entry",
      value: faq,
      text: `Q: ${faq.question} A: ${faq.answer}`,
      sourceUrl: faq.sourceUrl || website,
      evidenceType: "observed",
      confidence: "high",
      sourceSnippet: faq.question,
    });
  }

  for (const offer of projection.offers) {
    pushTextItem(out, {
      recordType: "offer",
      field: "hint",
      value: offer.label,
      text: offer.label,
      sourceUrl: offer.sourceUrl || website,
      evidenceType: "observed",
      confidence: "high",
    });
  }

  const signals = projection.signals;
  const signalTextFields: Array<[string, string]> = [
    ["title", signals.title],
    ["meta_description", signals.metaDescription],
    ["about_text", signals.aboutText],
    ["product_text", signals.productText],
    ["body_sample", signals.bodySample],
    ["testimonialText", signals.testimonialText],
  ];
  for (const [field, value] of signalTextFields) {
    if (!value?.trim()) continue;
    // Prefer structured FAQ/evidence over huge body blobs for narrative
    const confidence: DiscoveryConfidence =
      field === "body_sample" || field === "product_text" ? "medium" : "high";
    pushTextItem(out, {
      recordType: "signal",
      field,
      value,
      text: value.slice(0, 600),
      sourceUrl: website,
      evidenceType: "observed",
      confidence,
    });
  }
  for (const heading of signals.headings) {
    pushTextItem(out, {
      recordType: "signal",
      field: "heading",
      value: heading,
      text: heading,
      sourceUrl: website,
      evidenceType: "observed",
      confidence: "high",
    });
  }
  for (const cta of signals.ctaTexts) {
    pushTextItem(out, {
      recordType: "signal",
      field: "cta",
      value: cta,
      text: cta,
      sourceUrl: website,
      evidenceType: "observed",
      confidence: "high",
    });
  }

  return deduplicateEvidence(repairGluedText(out, projection.businessName));
}

/**
 * Profiles captured before `html-clean` separated block boundaries still hold
 * run-together text. Repair on read so stored data does not have to be recrawled
 * for the card to be legible.
 */
function repairGluedText(
  items: EvidenceItem[],
  businessName: string
): EvidenceItem[] {
  const protect = businessName.trim() ? [businessName.trim()] : [];
  return items.map((item) => {
    if (!item.normalizedText) return item;
    const repaired = deglueText(item.normalizedText, protect);
    if (repaired === item.normalizedText) return item;
    return {
      ...item,
      normalizedText: repaired,
      sourceSnippet: item.sourceSnippet
        ? deglueText(item.sourceSnippet, protect)
        : item.sourceSnippet,
    };
  });
}

export function normalizeCsvRows(
  projection: CompanyProfileProjection
): EvidenceItem[] {
  return buildEvidenceIndex(projection);
}
