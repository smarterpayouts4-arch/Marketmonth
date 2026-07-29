import type { ContentBrainContext } from "@/brain/content/types";

import { buildTopicEvidenceIndex } from "../evidence";
import { isNavChrome, segmentCamelGlued } from "../evidence/sanitize";
import { clampLabel, pushUnique } from "./helpers";
import type { TopicSubject } from "./types";

const CHROME_HEADING =
  /^(home|about|contact|faq|blog|shop|menu|navigation|skip to content)$/i;

/**
 * Subjects from PII-scrubbed crawl signals: headings, CTAs, product text segments.
 */
export function extractSignalSubjects(
  context: ContentBrainContext
): TopicSubject[] {
  const signals = context.signals;
  if (!signals) return [];

  const index = buildTopicEvidenceIndex(context);
  const out: TopicSubject[] = [];
  const protect = context.brandName.trim() ? [context.brandName.trim()] : [];

  const idsForField = (field: string, text: string): string[] =>
    index.items
      .filter(
        (i) =>
          i.field === field &&
          i.normalizedText.toLowerCase() === text.toLowerCase()
      )
      .map((i) => i.id)
      .slice(0, 2);

  for (const heading of signals.headings) {
    const label = clampLabel(heading, 80);
    if (!label || label.length < 4) continue;
    if (CHROME_HEADING.test(label)) continue;
    if (isNavChrome(label)) continue;
    const evidenceIds = idsForField("heading", heading);
    if (!evidenceIds.length) continue;
    pushUnique(out, {
      label,
      kind: "brand_position",
      sourceField: "signals.headings",
      evidenceIds,
      classificationReason: "Page heading reflects published brand messaging",
      classificationConfidence: "high",
    });
  }

  for (const cta of signals.ctaTexts) {
    const label = clampLabel(cta, 64);
    if (!label || label.length < 4) continue;
    if (isNavChrome(label)) continue;
    const evidenceIds = idsForField("cta", cta);
    if (!evidenceIds.length) continue;
    pushUnique(out, {
      label,
      kind: "decision_criterion",
      sourceField: "signals.ctaTexts",
      evidenceIds,
      classificationReason: "Published CTA reflects conversion path language",
      classificationConfidence: "medium",
    });
  }

  if (signals.productText?.trim()) {
    const segments = segmentCamelGlued(signals.productText.slice(0, 400), protect);
    const productIds = index.items
      .filter((i) => i.field === "productText")
      .map((i) => i.id)
      .slice(0, 2);

    for (const segment of segments) {
      if (segment.length < 12 || segment.length > 80) continue;
      if (isNavChrome(segment)) continue;
      const label = clampLabel(segment, 80);
      if (!productIds.length) continue;
      pushUnique(out, {
        label,
        kind: "product_category",
        sourceField: "signals.productText",
        evidenceIds: productIds,
        classificationReason:
          "Product page text segment supports education framing",
        classificationConfidence: "medium",
      });
    }
  }

  return out.slice(0, 10);
}
