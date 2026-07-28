import { POSITIVE_INGREDIENT_TOKEN_RE } from "../subjects/ingredient-patterns";
import type { TopicSeed } from "../objective-topic-strategies";

import { buildTopicTitleHookContext } from "./topic-title-hook/hook-context";

/**
 * Grounded support key for completeness honesty.
 * Framing alone cannot distinguish keys — six templates on one category
 * share one key and cannot claim complete.
 * Industry research: same source page / opportunity family = one key.
 */
export function groundedSupportKey(seed: TopicSeed): string {
  if (
    seed.sourceType === "industry_research" &&
    seed.supportFamilyKey?.trim()
  ) {
    const family = seed.supportFamilyKey.trim().toLowerCase();
    return `industry_research|${family}`;
  }
  const label = seed.subject.trim().toLowerCase().replace(/\s+/g, " ");
  return `${seed.subjectType}|${label}`;
}

/**
 * Primary subject family for display-intent near-dupe control.
 * Collapses "Magnesium glycinate" → "magnesium" so generic label checks share a family.
 * Does not redefine groundedSupportKey.
 */
export function primarySubjectFamily(seed: TopicSeed): string {
  const raw = seed.subject.trim().replace(/\s+/g, " ");
  const ingredient = raw.match(POSITIVE_INGREDIENT_TOKEN_RE)?.[1]?.trim();
  if (ingredient) {
    const lead = ingredient.toLowerCase().split(/\s+/)[0]!;
    // Magnesium glycinate → magnesium; Omega-3 stays omega-3
    if (/^omega-?3$/i.test(ingredient)) return "omega-3";
    if (/^vitamin\s+/i.test(ingredient)) {
      return ingredient.toLowerCase().replace(/\s+/g, " ");
    }
    return lead;
  }
  if (seed.subjectType === "comparison_attribute") {
    const ctx = buildTopicTitleHookContext(seed);
    const attr = ctx.comparisonAttribute?.trim().toLowerCase();
    if (attr) return attr.replace(/\s+/g, "_");
  }
  return raw.toLowerCase().replace(/\s+/g, " ").slice(0, 48);
}

function attributeOrActionBucket(seed: TopicSeed): string {
  const ctx = buildTopicTitleHookContext(seed);
  const attr = ctx.comparisonAttribute?.trim().toLowerCase();
  if (attr === "price per serving") return "price_per_serving";
  if (attr === "serving size") return "serving_size";
  if (attr === "form") return "form";
  if (attr && attr !== "label" && attr !== "label detail") {
    return attr.replace(/\s+/g, "_");
  }
  // comparison_attribute subjects without a richer phrase still use attr family
  if (seed.subjectType === "comparison_attribute" && attr) {
    return attr.replace(/\s+/g, "_");
  }
  return "generic_label_check";
}

/**
 * Additional final-set quality gate (not a support-key replacement).
 * Key = primarySubjectFamily + attributeOrActionBucket.
 * frameHint is intentionally excluded from the main key.
 */
export function displayIntentKey(seed: TopicSeed): string {
  return `${primarySubjectFamily(seed)}|${attributeOrActionBucket(seed)}`;
}

/**
 * Pick highest-scoring candidates with distinct support keys AND
 * distinct display-intent keys (order preserved).
 * Completeness must be re-derived from this filtered list length.
 */
export function selectDistinctSupportKeys<T extends { seed: TopicSeed }>(
  ranked: T[],
  limit: number
): T[] {
  const seenSupport = new Set<string>();
  const seenDisplay = new Set<string>();
  const out: T[] = [];
  for (const item of ranked) {
    const support = groundedSupportKey(item.seed);
    const display = displayIntentKey(item.seed);
    if (seenSupport.has(support) || seenDisplay.has(display)) continue;
    seenSupport.add(support);
    seenDisplay.add(display);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}
