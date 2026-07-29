import type {
  DiscoveryBullet,
  DiscoveryEvidenceRef,
} from "@/lib/discovery/discovery-narrative.schema";
import { clipToWordBoundary } from "@/lib/discovery/text-display";

import type { EvidenceItem } from "../types";

export function toEvidenceRef(item: EvidenceItem): DiscoveryEvidenceRef {
  return {
    field: item.field,
    sourceUrl: item.sourceUrl || "https://example.invalid",
    evidenceType: item.evidenceType,
    confidence: item.confidence,
    excerpt: clipToWordBoundary(
      item.normalizedText ?? String(item.value ?? ""),
      160
    ),
  };
}

function fingerprint(item: EvidenceItem): string {
  return (item.normalizedText ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dedupeByFingerprint(items: EvidenceItem[]): EvidenceItem[] {
  const seen = new Set<string>();
  const out: EvidenceItem[] = [];
  for (const item of items) {
    const fp = fingerprint(item);
    if (!fp || seen.has(fp)) continue;
    seen.add(fp);
    out.push(item);
  }
  return out;
}

/**
 * Tracks which evidence a section has already shown so later bullets prefer
 * unseen support. Without this, several bullets share the same `evidence[0]`
 * and the card renders identical "Why we believe this" rows.
 */
export type EvidenceLedger = {
  order: (items: EvidenceItem[]) => EvidenceItem[];
  claim: (item: EvidenceItem) => void;
};

export function createEvidenceLedger(): EvidenceLedger {
  const usedIds = new Set<string>();
  const usedFingerprints = new Set<string>();
  return {
    order(items) {
      const isUsed = (i: EvidenceItem) =>
        usedIds.has(i.id) || usedFingerprints.has(fingerprint(i));
      return [...items.filter((i) => !isUsed(i)), ...items.filter(isUsed)];
    },
    claim(item) {
      usedIds.add(item.id);
      const fp = fingerprint(item);
      if (fp) usedFingerprints.add(fp);
    },
  };
}

/**
 * A bullet may not claim `observed` unless its primary evidence is observed.
 * Inferred and recommended framings are the author's own and pass through.
 */
function reconcileClassification(
  requested: DiscoveryBullet["classification"] | undefined,
  primary: EvidenceItem
): DiscoveryBullet["classification"] {
  if (!requested) return primary.evidenceType;
  if (requested === "observed" && primary.evidenceType !== "observed") {
    return primary.evidenceType;
  }
  return requested;
}

export function bulletFrom(
  text: string,
  items: EvidenceItem[],
  classification?: DiscoveryBullet["classification"],
  ledger?: EvidenceLedger
): DiscoveryBullet | null {
  const usable = dedupeByFingerprint(items.filter((i) => i.normalizedText));
  if (!usable.length || !text.trim()) return null;
  const ordered = ledger ? ledger.order(usable) : usable;
  const chosen = ordered.slice(0, 3);
  const primary = chosen[0]!;
  ledger?.claim(primary);
  return {
    text: text.trim(),
    classification: reconcileClassification(classification, primary),
    evidence: chosen.map(toEvidenceRef),
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
