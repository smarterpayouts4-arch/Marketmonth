import type { TopicSeed } from "../../objective-topic-strategies";
import { POSITIVE_INGREDIENT_TOKEN_RE } from "../../subjects/ingredient-patterns";
import { isMalformedSubjectLabel } from "../../subjects/subject-label";
import { naturalCategoryNoun } from "../text";

import type { TopicTitleHookContext } from "./types";

const ATTR_PHRASES: Array<{ re: RegExp; label: string }> = [
  { re: /price\s+per\s+serving/i, label: "price per serving" },
  { re: /serving\s+size/i, label: "serving size" },
  { re: /\blabel\s+detail/i, label: "label detail" },
  { re: /\blabel\b/i, label: "label" },
  { re: /\bform(?:ulation)?s?\b/i, label: "form" },
  // P2.3 typed commerce attributes — industry-agnostic families surfaced
  // from typed commercial/catalog fields (extract-comparison).
  { re: /\bpric(?:e|es|ing)\b|\bcosts?\b/i, label: "price" },
  { re: /\b(?:shipping|delivery)\b/i, label: "shipping" },
  { re: /\b(?:returns?|refunds?)\b/i, label: "returns" },
  { re: /\b(?:warrant(?:y|ies)|guarantees?d?)\b/i, label: "warranty" },
  { re: /\bsubscriptions?\b/i, label: "subscription" },
];

function matchAttrPhrase(text: string): string | undefined {
  for (const { re, label } of ATTR_PHRASES) {
    if (re.test(text)) return label;
  }
  return undefined;
}

function stripInstructionalLead(raw: string): string {
  let s = raw.trim().replace(/\s+/g, " ");
  s = s.replace(
    /^(how to|how should|what to|what|why|when|where|who|help|helping)\s+/i,
    ""
  );
  s = s.replace(
    /^(check on a|check on|check|compare|comparing|evaluating|evaluate|looking at)\s+/i,
    ""
  );
  return s.trim();
}

/** Singular category noun for a/an and buy/compare shells (not One-X-check). */
export function singularForOneCheck(noun: string): string {
  const t = noun.trim();
  const lower = t.toLowerCase();
  if (lower === "supplements") return "supplement";
  if (lower === "vitamins") return "vitamin";
  if (lower === "minerals") return "mineral";
  if (lower === "products") return "product";
  if (lower === "brands") return "brand";
  if (lower.endsWith("ies") && lower.length > 4) {
    return `${t.slice(0, -3)}y`;
  }
  if (
    lower.endsWith("s") &&
    !lower.endsWith("ss") &&
    !lower.endsWith("us") &&
    !/\d/.test(lower)
  ) {
    return t.slice(0, -1);
  }
  return t;
}

export function isPluralCategoryLabel(noun: string): boolean {
  const lower = noun.trim().toLowerCase();
  return (
    lower === "supplements" ||
    lower === "vitamins" ||
    lower === "minerals" ||
    lower === "products" ||
    (lower.endsWith("s") && !lower.endsWith("ss") && !POSITIVE_INGREDIENT_TOKEN_RE.test(noun))
  );
}

/**
 * Build hook context from already-classified TopicSeed metadata.
 * Regex is a narrow fallback when labels are long instructional strings.
 */
export function buildTopicTitleHookContext(
  seed: TopicSeed
): TopicTitleHookContext {
  const raw = seed.subject.trim().replace(/\s+/g, " ");
  const attr = matchAttrPhrase(raw);
  const ingredient = raw.match(POSITIVE_INGREDIENT_TOKEN_RE)?.[1]?.trim();
  const cleaned = stripInstructionalLead(raw);
  const ingredient2 = cleaned.match(POSITIVE_INGREDIENT_TOKEN_RE)?.[1]?.trim();

  let primaryLabel = "";
  if (ingredient || ingredient2) {
    primaryLabel = (ingredient ?? ingredient2)!;
  } else if (
    seed.subjectType === "comparison_attribute" &&
    attr
  ) {
    primaryLabel = attr;
  } else if (seed.subjectType === "product_category") {
    primaryLabel = naturalCategoryNoun(raw);
  } else if (cleaned.length > 0 && cleaned.length <= 42) {
    primaryLabel = cleaned;
  } else {
    const about = cleaned.match(
      /\babout\s+([A-Z][\w]+(?:\s+[A-Za-z0-9-]+)?)/
    );
    if (about?.[1]) primaryLabel = about[1];
    else {
      const cap = cleaned.match(
        /\b([A-Z][\w]*(?:-\d+)?(?:\s+[A-Za-z][\w-]{0,20})?)/
      );
      if (cap?.[1] && !/^(How|What|Why|The|One|Help|Helping)$/i.test(cap[1])) {
        primaryLabel = cap[1];
      } else {
        primaryLabel = cleaned.slice(0, 40) || raw.slice(0, 40);
      }
    }
  }

  if (isMalformedSubjectLabel(primaryLabel) || /^(Help|Helping)\b/i.test(primaryLabel)) {
    primaryLabel = "";
  }

  // Only set when a real attr phrase exists — never default to vague "label detail"
  const actionObject = attr;

  return {
    primaryLabel: primaryLabel.trim(),
    primaryKind: seed.subjectType,
    actionObject,
    comparisonAttribute: attr,
    categoryLabel:
      seed.subjectType === "product_category"
        ? naturalCategoryNoun(raw)
        : undefined,
    frameHint: seed.frameHint,
    evidenceIds: [...seed.evidenceIds],
  };
}
