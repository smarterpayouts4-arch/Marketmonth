import { segmentBlockBoundaries } from "./segment";
import type { OutcomePair } from "./types";

const DETERMINER_LED = /^(The|A|An|Your)\s+\S/;

const OUTCOME_EVIDENCE_FIELDS = new Set([
  "productsServices",
  "productText",
  "products",
  "services",
]);

type RawPair = {
  ingredient: string;
  descriptor: string;
  sourceText: string;
  evidenceIds: string[];
  sourceField: string;
};

function discoverCategoryNouns(descriptors: string[]): Set<string> {
  const trailing = new Map<string, number>();
  for (const d of descriptors) {
    const words = d.split(/\s+/);
    const last = words[words.length - 1]?.toLowerCase().replace(/[^a-z]/g, "");
    if (!last || last.length < 3) continue;
    trailing.set(last, (trailing.get(last) ?? 0) + 1);
  }
  return new Set(
    [...trailing.entries()].filter(([, n]) => n >= 2).map(([w]) => w)
  );
}

function looksLikeOfferingLabel(segment: string): boolean {
  if (!segment || segment.split(/\s+/).length > 3) return false;
  if (!/^[A-Z]/.test(segment)) return false;
  if (/[.?!,:;]$/.test(segment)) return false;
  return true;
}

function looksLikeDescriptor(segment: string): boolean {
  if (!segment || segment.split(/\s+/).length > 6) return false;
  return DETERMINER_LED.test(segment);
}

function extractRawPairsFromText(args: {
  text: string;
  sourceField: string;
  evidenceIds: string[];
}): RawPair[] {
  const segments = segmentBlockBoundaries(args.text);
  const raw: RawPair[] = [];
  for (let i = 0; i < segments.length - 1; i += 1) {
    const ingredient = segments[i];
    const descriptor = segments[i + 1];
    if (!ingredient || !descriptor) continue;
    if (!looksLikeOfferingLabel(ingredient)) continue;
    if (!looksLikeDescriptor(descriptor)) continue;
    raw.push({
      ingredient,
      descriptor,
      sourceText: `${ingredient}${descriptor}`,
      evidenceIds: args.evidenceIds,
      sourceField: args.sourceField,
    });
  }
  return raw;
}

function finalizePairs(raw: RawPair[]): OutcomePair[] {
  const categoryNouns = discoverCategoryNouns(raw.map((r) => r.descriptor));
  const out: OutcomePair[] = [];
  const seen = new Set<string>();

  for (const r of raw) {
    const words = r.descriptor.split(/\s+/);
    let body = words.slice(1);
    const last = body[body.length - 1]?.toLowerCase().replace(/[^a-z]/g, "");
    if (last && categoryNouns.has(last)) body = body.slice(0, -1);
    const outcome = body.join(" ").trim();
    if (!outcome) continue;
    const key = `${r.ingredient.toLowerCase()}|${outcome.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      ingredient: r.ingredient,
      outcome,
      descriptor: r.descriptor,
      sourceText: r.sourceText,
      evidenceIds: r.evidenceIds,
      sourceField: r.sourceField,
    });
  }
  return out;
}

export function pairOutcomeSubjectsFromCorpus(
  sources: Array<{ text: string; sourceField: string; evidenceIds: string[] }>
): OutcomePair[] {
  const raw: RawPair[] = [];
  for (const src of sources) {
    const text = src.text.trim();
    if (!text) continue;
    raw.push(
      ...extractRawPairsFromText({
        text,
        sourceField: src.sourceField,
        evidenceIds: src.evidenceIds,
      })
    );
  }
  return finalizePairs(raw);
}

export function isOutcomeEvidenceField(field: string): boolean {
  return OUTCOME_EVIDENCE_FIELDS.has(field);
}
