import {
  pipelineTrace,
  recordSubjectRejection,
} from "@/brain/debug/pipeline-trace";

export type SubjectRejectionReason =
  | "empty"
  | "help_fragment"
  | "incomplete_interrogative"
  | "audience_participle"
  | "broken_preposition"
  | "too_short"
  | "multi_item_catalog"
  | "other_malformed";

export type SubjectRejectionDetail = {
  malformed: boolean;
  reason: SubjectRejectionReason;
  repeatedHead?: string;
  itemCount?: number;
};

/**
 * Detect catalog-list subjects: repeated vitamin/mineral heads or
 * multiple ingredient tokens in one label.
 */
export function analyzeMultiItemCatalog(label: string): {
  isMulti: boolean;
  repeatedHead?: string;
  itemCount: number;
} {
  const t = label.trim().replace(/\s+/g, " ");
  const words = t.split(/\s+/).filter(Boolean);

  // Repeated "Vitamin(s)" / "Mineral(s)" style heads
  const headCounts = new Map<string, number>();
  for (const w of words) {
    const key = w.toLowerCase().replace(/s$/, "");
    if (key.length < 4) continue;
    if (
      /^(vitamin|mineral|supplement|service|product|category)$/i.test(key) ||
      /^vitamin$/i.test(key)
    ) {
      headCounts.set(key, (headCounts.get(key) ?? 0) + 1);
    }
  }
  for (const [head, n] of headCounts) {
    if (n >= 2) {
      return { isMulti: true, repeatedHead: head, itemCount: n };
    }
  }

  // "Vitamin D" / "Vitamin C" pattern count
  const vitaminItems = t.match(/\bVitamin\s+[A-Z0-9]+\b/gi) ?? [];
  if (vitaminItems.length >= 2) {
    return {
      isMulti: true,
      repeatedHead: "vitamin",
      itemCount: vitaminItems.length,
    };
  }

  // Catalog-list residue: many ingredient-like Title-Case tokens without verbs
  // (e.g. "Magnesium Zinc Calcium Iron…"). Do NOT flag normal marketing titles
  // like "Compare Supplement Prices Based on Your Preferences".
  const ingredientish =
    t.match(
      /\b(Magnesium|Zinc|Calcium|Iron|Potassium|Selenium|Ashwagandha|Creatine|Collagen|Probiotics|Omega-?3)\b/gi
    ) ?? [];
  if (ingredientish.length >= 3 && words.length >= 6) {
    return { isMulti: true, itemCount: ingredientish.length };
  }

  return { isMulti: false, itemCount: ingredientish.length };
}

export function analyzeMalformedSubject(label: string): SubjectRejectionDetail {
  const t = label.trim().replace(/\s+/g, " ");
  if (!t) return { malformed: true, reason: "empty" };

  if (/^(Help|Helping)\s+\S+$/i.test(t)) {
    return { malformed: true, reason: "help_fragment" };
  }
  if (/^(Help|Helping)\b/i.test(t) && t.split(/\s+/).length < 3) {
    return { malformed: true, reason: "help_fragment" };
  }
  if (/^(How|What|Why|When|Where|Who)\s*$/i.test(t)) {
    return { malformed: true, reason: "incomplete_interrogative" };
  }
  if (/^(How|What|Why)\s+(to|about|for)?\s*$/i.test(t)) {
    return { malformed: true, reason: "incomplete_interrogative" };
  }
  if (
    /^(shoppers|buyers|customers|patients|parents|users|people)\s+(comparing|shopping|looking|buying|choosing)$/i.test(
      t
    )
  ) {
    return { malformed: true, reason: "audience_participle" };
  }
  if (/\b(in on|for to|of to|at to|to to)\b/i.test(t)) {
    return { malformed: true, reason: "broken_preposition" };
  }
  if (/\b(in|on|at|for|to|of|and|or)\s*$/i.test(t)) {
    return { malformed: true, reason: "broken_preposition" };
  }
  if (t.split(/\s+/).length === 1 && t.length < 4) {
    return { malformed: true, reason: "too_short" };
  }

  const multi = analyzeMultiItemCatalog(t);
  if (multi.isMulti) {
    return {
      malformed: true,
      reason: "multi_item_catalog",
      repeatedHead: multi.repeatedHead,
      itemCount: multi.itemCount,
    };
  }

  return { malformed: false, reason: "other_malformed" };
}

export function logSubjectRejection(opts: {
  candidate: string;
  reason: SubjectRejectionReason;
  repeatedHead?: string;
  itemCount?: number;
  sourceField?: string;
  company?: string;
}): void {
  recordSubjectRejection(opts.reason);
  pipelineTrace(
    "subject.malformed",
    {
      candidate: opts.candidate,
      reason: opts.reason,
      repeatedHead: opts.repeatedHead,
      itemCount: opts.itemCount,
      sourceField: opts.sourceField,
      company: opts.company,
    },
    opts.reason === "multi_item_catalog" ? "fail" : "warn"
  );
}
