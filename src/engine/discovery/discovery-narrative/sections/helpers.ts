import type {
  DiscoveryBullet,
  DiscoveryEvidenceRef,
} from "@/lib/discovery/discovery-narrative.schema";

import type { EvidenceItem } from "../types";

export function toEvidenceRef(item: EvidenceItem): DiscoveryEvidenceRef {
  return {
    field: item.field,
    sourceUrl: item.sourceUrl || "https://example.invalid",
    evidenceType: item.evidenceType,
    confidence: item.confidence,
    excerpt: (item.normalizedText ?? String(item.value ?? "")).slice(0, 160),
  };
}

export function bulletFrom(
  text: string,
  items: EvidenceItem[],
  classification?: DiscoveryBullet["classification"]
): DiscoveryBullet | null {
  const usable = items.filter((i) => i.normalizedText);
  if (!usable.length || !text.trim()) return null;
  const primary = usable[0]!;
  return {
    text: text.trim(),
    classification: classification ?? primary.evidenceType,
    evidence: usable.slice(0, 3).map(toEvidenceRef),
  };
}

export function pickText(items: EvidenceItem[], max = 1): EvidenceItem[] {
  return items.filter((i) => i.normalizedText).slice(0, max);
}

export function firstText(items: EvidenceItem[]): string | undefined {
  return items.find((i) => i.normalizedText)?.normalizedText;
}

export function businessNoun(name: string): string {
  return name.trim() || "This business";
}
