import { createHash } from "node:crypto";

import type { ContentBrainContext, ContentEvidence } from "@/brain/content/types";

import { deduplicateEvidenceItems } from "./dedupe";
import {
  asClassification,
  asConfidence,
  isStructuredEvidenceField,
  parseStructuredEvidenceValue,
} from "./parse-structured";
import { sanitizeEvidenceValue } from "./sanitize";
import {
  scoreEvidenceQuality,
  type EvidenceClassification,
  type EvidenceConfidence,
} from "./score";
import {
  classifyEvidenceSignalType,
  type TopicEvidenceSignalType,
} from "./signal-taxonomy";
import type { TopicEvidenceIndex, TopicEvidenceItem } from "./types";

function stableId(
  recordType: string,
  field: string,
  value: string,
  sourceUrl: string
): string {
  return createHash("sha1")
    .update(`${recordType}|${field}|${value}|${sourceUrl}`)
    .digest("hex")
    .slice(0, 16);
}

function isIndustryResearch(ev: ContentEvidence): boolean {
  const type = (ev.evidenceType ?? "").toLowerCase();
  const record = (ev.recordType ?? "").toLowerCase();
  return type === "industry_research" || record === "industry_research";
}

const CONTACT_FIELD_RE =
  /^(?:contact)?(?:email|phone|tel|telephone|fax|address|mailingAddress)$/i;

function finalizeItem(
  item: Omit<TopicEvidenceItem, "id" | "signalType"> & { id?: string },
  protect: string[]
): TopicEvidenceItem | null {
  const sanitized = sanitizeEvidenceValue(item.normalizedText, { protect });
  if (!sanitized) return null;

  const signalType = classifyEvidenceSignalType({
    field: item.field,
    recordType: item.recordType,
  });

  return {
    ...item,
    id:
      item.id ??
      stableId(item.recordType, item.field, sanitized, item.sourceUrl),
    normalizedText: sanitized,
    value: item.value || sanitized,
    signalType,
    qualityScore: scoreEvidenceQuality({
      evidenceType: item.evidenceType,
      confidence: item.confidence,
    }),
  };
}

function pushFromEvidence(
  out: TopicEvidenceItem[],
  ev: ContentEvidence,
  protect: string[],
  opts?: { skipIndustryResearch?: boolean }
): void {
  if (opts?.skipIndustryResearch && isIndustryResearch(ev)) return;
  if (CONTACT_FIELD_RE.test(ev.field)) return;

  if (isStructuredEvidenceField(ev.field)) {
    const parsed = parseStructuredEvidenceValue(
      ev.field,
      ev.value,
      ev.sourceUrl,
      asClassification(ev.evidenceType),
      asConfidence(ev.confidence),
      ev.recordType
    );
    for (const p of parsed) {
      // Multi-segment topic lists need distinct ids per segment; a single
      // structured value keeps the parent evidence id for stable refs.
      const finalized = finalizeItem(
        {
          ...p,
          id: parsed.length === 1 ? ev.id : undefined,
        },
        protect
      );
      if (finalized) out.push(finalized);
    }
    return;
  }

  const finalized = finalizeItem(
    {
      id: ev.id,
      recordType: ev.recordType,
      field: ev.field,
      value: ev.value,
      normalizedText: ev.value,
      sourceUrl: ev.sourceUrl,
      evidenceType: asClassification(ev.evidenceType),
      confidence: asConfidence(ev.confidence),
      sourceSnippet: ev.sourceSnippet,
      qualityScore: 0,
    },
    protect
  );
  if (finalized) out.push(finalized);
}

function indexBySignalType(
  items: TopicEvidenceItem[]
): Partial<Record<TopicEvidenceSignalType, TopicEvidenceItem[]>> {
  const bySignal: Partial<Record<TopicEvidenceSignalType, TopicEvidenceItem[]>> =
    {};
  for (const item of items) {
    const list = bySignal[item.signalType] ?? [];
    list.push(item);
    bySignal[item.signalType] = list;
  }
  return bySignal;
}

/**
 * Build a scored, deduplicated evidence index from ContentBrainContext.
 * Excludes industry_research rows from proof-quality indexing.
 */
export function buildTopicEvidenceIndex(
  context: ContentBrainContext
): TopicEvidenceIndex {
  const protect = context.brandName.trim() ? [context.brandName.trim()] : [];
  const raw: TopicEvidenceItem[] = [];

  for (const ev of Object.values(context.evidenceById)) {
    pushFromEvidence(raw, ev, protect, { skipIndustryResearch: true });
  }

  for (const faq of context.faqs ?? []) {
    const text = `Q: ${faq.question} A: ${faq.answer}`;
    const item = finalizeItem(
      {
        recordType: "faq",
        field: "faq",
        value: text,
        normalizedText: text,
        sourceUrl: faq.sourceUrl ?? context.website,
        evidenceType: "observed",
        confidence: "high",
        sourceSnippet: faq.question,
        qualityScore: 1,
      },
      protect
    );
    if (item) raw.push(item);
  }

  for (const term of context.commercialTerms ?? []) {
    const item = finalizeItem(
      {
        recordType: "offer",
        field: "commercialTerms",
        value: term.label,
        normalizedText: term.label,
        sourceUrl: term.sourceUrl ?? context.website,
        evidenceType: "observed",
        confidence: "high",
        qualityScore: 1,
      },
      protect
    );
    if (item) {
      raw.push({ ...item, signalType: "commercial_term" });
    }
  }

  const signals = context.signals;
  if (signals) {
    const signalFields: Array<[string, string]> = [
      ["aboutText", signals.aboutText],
      ["productText", signals.productText],
      ["bodySample", signals.bodySample],
      ["testimonialText", signals.testimonialText],
    ];
    for (const [field, value] of signalFields) {
      if (!value?.trim()) continue;
      const confidence = field === "bodySample" || field === "productText"
        ? "medium"
        : "high";
      const item = finalizeItem(
        {
          recordType: "signal",
          field,
          value,
          normalizedText: value.slice(0, 600),
          sourceUrl: context.website,
          evidenceType: "observed",
          confidence,
          qualityScore: 0,
        },
        protect
      );
      if (item) raw.push(item);
    }
    for (const heading of signals.headings) {
      const item = finalizeItem(
        {
          recordType: "signal",
          field: "heading",
          value: heading,
          normalizedText: heading,
          sourceUrl: context.website,
          evidenceType: "observed",
          confidence: "high",
          qualityScore: 1,
        },
        protect
      );
      if (item) raw.push(item);
    }
    for (const cta of signals.ctaTexts) {
      const item = finalizeItem(
        {
          recordType: "signal",
          field: "cta",
          value: cta,
          normalizedText: cta,
          sourceUrl: context.website,
          evidenceType: "observed",
          confidence: "high",
          qualityScore: 1,
        },
        protect
      );
      if (item) raw.push(item);
    }
  }

  const scalarFields: Array<{
    field: string;
    value?: string;
    evidenceType?: EvidenceClassification;
    confidence?: EvidenceConfidence;
  }> = [
    { field: "description", value: context.description, evidenceType: "observed", confidence: "medium" },
    { field: "audience", value: context.audience, evidenceType: "observed", confidence: "medium" },
    { field: "valueProposition", value: context.valueProposition, evidenceType: "observed", confidence: "high" },
    { field: "brandVoice", value: context.brandVoice, evidenceType: "observed", confidence: "medium" },
    { field: "marketingOpportunity", value: context.marketingOpportunity, evidenceType: "recommended", confidence: "medium" },
  ];

  for (const { field, value, evidenceType, confidence } of scalarFields) {
    if (!value?.trim()) continue;
    const item = finalizeItem(
      {
        recordType: "brand_profile",
        field,
        value,
        normalizedText: value,
        sourceUrl: context.website,
        evidenceType: evidenceType ?? "observed",
        confidence: confidence ?? "medium",
        qualityScore: 0,
      },
      protect
    );
    if (item) raw.push(item);
  }

  if (context.brandName?.trim()) {
    const item = finalizeItem(
      {
        recordType: "brand_profile",
        field: "businessName",
        value: context.brandName,
        normalizedText: context.brandName,
        sourceUrl: context.website,
        evidenceType: "observed",
        confidence: "high",
        qualityScore: 1,
      },
      protect
    );
    if (item) raw.push(item);
  }

  for (const p of context.products) {
    const parsed = parseStructuredEvidenceValue(
      "products",
      p,
      context.website,
      "inferred",
      "medium",
      "brand_profile"
    );
    for (const row of parsed) {
      const item = finalizeItem(row, protect);
      if (item) raw.push(item);
    }
  }

  for (const p of context.indexedProducts) {
    const item = finalizeItem(
      {
        recordType: "brand_profile",
        field: "indexedProduct",
        value: p.name,
        normalizedText: p.name,
        sourceUrl: p.sourceUrl ?? context.website,
        evidenceType: "observed",
        confidence: "high",
        qualityScore: 1,
      },
      protect
    );
    if (item) raw.push(item);
  }

  const items = deduplicateEvidenceItems(raw);
  const itemsById = Object.fromEntries(items.map((i) => [i.id, i]));
  const faqs = items.filter((i) => i.signalType === "faq");
  const commercialTerms = items.filter(
    (i) => i.signalType === "commercial_term"
  );

  return {
    itemsById,
    items,
    faqs,
    commercialTerms,
    bySignalType: indexBySignalType(items),
  };
}
