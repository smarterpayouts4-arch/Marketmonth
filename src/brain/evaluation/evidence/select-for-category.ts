import type { TopicCategoryId } from "@/brain/content/topic-category";
import { preferredFieldsForCategory } from "@/brain/content/topic-category";

import { compareEvidencePriority } from "./dedupe";
import { failsGenericInsight } from "./sanitize";
import type { TopicEvidenceSignalType } from "./signal-taxonomy";
import type { TopicEvidenceIndex, TopicEvidenceItem } from "./types";

export type SelectEvidenceOptions = {
  minCount?: number;
  maxCount?: number;
  /** Minimum quality score — defaults to 0.55 (medium floor). */
  minQuality?: number;
};

const DEFAULT_MIN = 12;
const DEFAULT_MAX = 24;

function fieldMatchesPreferred(item: TopicEvidenceItem, preferred: string[]): boolean {
  const fieldLower = item.field.toLowerCase();
  return preferred.some(
    (p) =>
      fieldLower === p.toLowerCase() ||
      fieldLower.includes(p.toLowerCase()) ||
      p.toLowerCase().includes(fieldLower)
  );
}

function meetsQualityFloor(item: TopicEvidenceItem, minQuality: number): boolean {
  if (item.qualityScore < minQuality) return false;
  if (!item.normalizedText || failsGenericInsight(item.normalizedText)) {
    return false;
  }
  return true;
}

function preferObservedHigh(items: TopicEvidenceItem[]): TopicEvidenceItem[] {
  const observedHigh = items.filter(
    (i) => i.evidenceType === "observed" && i.confidence === "high"
  );
  if (observedHigh.length >= DEFAULT_MIN) return observedHigh;
  const mediumPlus = items.filter((i) => i.qualityScore >= 0.55);
  return mediumPlus.length ? mediumPlus : items;
}

/**
 * Select 12–24 evidence items for a topic category.
 * Prefers category fields, observed/high quality, and signal-type balance.
 */
export function selectEvidenceForCategory(
  index: TopicEvidenceIndex,
  categoryId: TopicCategoryId,
  opts?: SelectEvidenceOptions
): TopicEvidenceItem[] {
  const minCount = opts?.minCount ?? DEFAULT_MIN;
  const maxCount = opts?.maxCount ?? DEFAULT_MAX;
  const minQuality = opts?.minQuality ?? 0.55;
  const preferred = [...preferredFieldsForCategory(categoryId)];

  const pool = preferObservedHigh(
    index.items.filter((i) => meetsQualityFloor(i, minQuality))
  );

  const preferredMatches = pool.filter((i) =>
    fieldMatchesPreferred(i, preferred)
  );
  const generalMatches = pool.filter(
    (i) => !fieldMatchesPreferred(i, preferred)
  );

  const selected: TopicEvidenceItem[] = [];
  const usedIds = new Set<string>();
  const signalCounts = new Map<TopicEvidenceSignalType, number>();

  const take = (item: TopicEvidenceItem) => {
    if (usedIds.has(item.id)) return;
    usedIds.add(item.id);
    selected.push(item);
    signalCounts.set(
      item.signalType,
      (signalCounts.get(item.signalType) ?? 0) + 1
    );
  };

  const sortedPreferred = [...preferredMatches].sort(compareEvidencePriority);
  const sortedGeneral = [...generalMatches].sort(compareEvidencePriority);

  // Fill preferred fields first
  for (const item of sortedPreferred) {
    if (selected.length >= maxCount) break;
    take(item);
  }

  // Balance signal types — pick underrepresented types from general pool
  const balancePass = () => {
    const bySignal = new Map<TopicEvidenceSignalType, TopicEvidenceItem[]>();
    for (const item of sortedGeneral) {
      if (usedIds.has(item.id)) continue;
      const list = bySignal.get(item.signalType) ?? [];
      list.push(item);
      bySignal.set(item.signalType, list);
    }
    const types = [...bySignal.keys()].sort(
      (a, b) => (signalCounts.get(a) ?? 0) - (signalCounts.get(b) ?? 0)
    );
    for (const signalType of types) {
      if (selected.length >= maxCount) break;
      const candidates = bySignal.get(signalType) ?? [];
      if (candidates[0]) take(candidates[0]);
    }
  };

  balancePass();

  for (const item of sortedGeneral) {
    if (selected.length >= maxCount) break;
    take(item);
  }

  // Top up from full index if below minimum
  if (selected.length < minCount) {
    for (const item of [...index.items].sort(compareEvidencePriority)) {
      if (selected.length >= minCount) break;
      if (!meetsQualityFloor(item, 0.2)) continue;
      take(item);
    }
  }

  return selected
    .sort(compareEvidencePriority)
    .slice(0, maxCount);
}
