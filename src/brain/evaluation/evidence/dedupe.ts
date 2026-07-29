import type { TopicEvidenceItem } from "./types";
import { looksClipped, normalizeUrlVariant, normalizeWhitespace } from "./sanitize";

function dedupeKey(item: TopicEvidenceItem): string {
  const text = normalizeWhitespace(
    (item.normalizedText ?? item.value).toLowerCase()
  ).slice(0, 160);
  const url = normalizeUrlVariant(item.sourceUrl || "");
  return `${item.recordType}|${item.field}|${text}|${url}`;
}

export function compareEvidencePriority(
  a: TopicEvidenceItem,
  b: TopicEvidenceItem
): number {
  if (b.qualityScore !== a.qualityScore) {
    return b.qualityScore - a.qualityScore;
  }
  const aLen = (a.normalizedText ?? "").length;
  const bLen = (b.normalizedText ?? "").length;
  return bLen - aLen;
}

/**
 * Deduplicate by field + normalized value + source_url + record_type.
 * When two rows share a field but one is clipped and one is complete,
 * keep the complete row (prefer-complete rule).
 */
export function deduplicateEvidenceItems(
  items: TopicEvidenceItem[]
): TopicEvidenceItem[] {
  const byField = new Map<string, TopicEvidenceItem[]>();
  for (const item of items) {
    const list = byField.get(item.field) ?? [];
    list.push(item);
    byField.set(item.field, list);
  }

  const kept: TopicEvidenceItem[] = [];
  const seenExact = new Set<string>();

  for (const [, group] of byField) {
    const ranked = [...group].sort((a, b) => {
      const aClip = a.normalizedText ? looksClipped(a.normalizedText) : true;
      const bClip = b.normalizedText ? looksClipped(b.normalizedText) : true;
      if (aClip !== bClip) return aClip ? 1 : -1;
      return compareEvidencePriority(a, b);
    });

    for (const item of ranked) {
      const key = dedupeKey(item);
      if (seenExact.has(key)) continue;

      if (
        item.recordType === "brand_profile" &&
        item.normalizedText &&
        looksClipped(item.normalizedText)
      ) {
        const completeSibling = ranked.find(
          (other) =>
            other !== item &&
            other.normalizedText &&
            !looksClipped(other.normalizedText) &&
            other.qualityScore >= item.qualityScore
        );
        if (completeSibling) continue;
      }

      seenExact.add(key);
      kept.push(item);
    }
  }

  return kept.sort(compareEvidencePriority);
}
