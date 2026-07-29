import type { EvidenceItem } from "../types";
import { compareEvidencePriority } from "./score-evidence";
import { looksClipped, normalizeUrlVariant, normalizeWhitespace } from "./sanitize";

function dedupeKey(item: EvidenceItem): string {
  const text = normalizeWhitespace(
    (item.normalizedText ?? String(item.value ?? "")).toLowerCase()
  ).slice(0, 160);
  const url = normalizeUrlVariant(item.sourceUrl || "");
  return `${item.recordType}|${item.field}|${text}|${url}`;
}

/**
 * Deduplicate by field + normalized value + source_url + record_type.
 * When two rows share a field but one is clipped and one is complete,
 * keep the complete row (prefer-complete rule).
 */
export function deduplicateEvidence(items: EvidenceItem[]): EvidenceItem[] {
  const byField = new Map<string, EvidenceItem[]>();
  for (const item of items) {
    const list = byField.get(item.field) ?? [];
    list.push(item);
    byField.set(item.field, list);
  }

  const kept: EvidenceItem[] = [];
  const seenExact = new Set<string>();

  for (const [, group] of byField) {
    // Prefer complete over clipped for the same field
    const ranked = [...group].sort((a, b) => {
      const aClip = a.normalizedText ? looksClipped(a.normalizedText) : true;
      const bClip = b.normalizedText ? looksClipped(b.normalizedText) : true;
      if (aClip !== bClip) return aClip ? 1 : -1;
      return compareEvidencePriority(a, b);
    });

    for (const item of ranked) {
      const key = dedupeKey(item);
      if (seenExact.has(key)) continue;

      // Skip clipped brand_profile summaries when a complete evidence row exists
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

/** Pick the best item for a field, preferring complete observed/high. */
export function bestForField(
  items: EvidenceItem[],
  field: string
): EvidenceItem | undefined {
  const matches = items.filter((i) => i.field === field);
  if (!matches.length) return undefined;
  return [...matches].sort((a, b) => {
    const aClip = a.normalizedText ? looksClipped(a.normalizedText) : true;
    const bClip = b.normalizedText ? looksClipped(b.normalizedText) : true;
    if (aClip !== bClip) return aClip ? 1 : -1;
    return compareEvidencePriority(a, b);
  })[0];
}
