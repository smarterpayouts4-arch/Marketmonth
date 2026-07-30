import { POSITIVE_INGREDIENT_TOKEN_RE } from "../subjects/ingredient-patterns";
import {
  isPrimaryProductEducationSubject,
  isProductEducationEligible,
  type TopicSubject,
} from "../topic-subject";
import {
  audienceNeedFrom,
  dedupeSeeds,
  seedFrom,
  type CategoryTopicStrategy,
  type TopicSeed,
} from "./types";

/**
 * Collapse "Magnesium glycinate" → "magnesium" so PE seed slots are not
 * burned on near-dupe ingredients that displayIntentKey would drop later.
 * Kept local to avoid ots ↔ gtc import cycles.
 */
function ingredientFamilyKey(label: string): string {
  const raw = label.trim().replace(/\s+/g, " ");
  const ingredient = raw.match(POSITIVE_INGREDIENT_TOKEN_RE)?.[1]?.trim();
  if (ingredient) {
    if (/^omega-?3$/i.test(ingredient)) return "omega-3";
    if (/^vitamin\s+/i.test(ingredient)) {
      return ingredient.toLowerCase().replace(/\s+/g, " ");
    }
    return ingredient.toLowerCase().split(/\s+/)[0]!;
  }
  return raw.toLowerCase();
}

function preferCanonicalIngredient(a: TopicSubject, b: TopicSubject): TopicSubject {
  // Prefer shorter canonical labels ("Magnesium" over "Magnesium glycinate").
  return a.label.trim().length <= b.label.trim().length ? a : b;
}

/**
 * Product Education: teach the category so the reader can judge options.
 *
 * platform_capability is deliberately excluded — walking through the company's
 * own interface is a product demo, not education. Strategies must not re-label
 * subject kinds; eligibility is decided by topic-subject.
 */
export const buildProductEducationSeeds: CategoryTopicStrategy = (
  _context,
  subjects
) => {
  const seeds: TopicSeed[] = [];
  const need = audienceNeedFrom(subjects);

  const primary = subjects.filter(isPrimaryProductEducationSubject);
  const eligible = subjects.filter(isProductEducationEligible);

  for (const s of eligible.filter((x) => x.kind === "health_outcome")) {
    seeds.push(seedFrom(s, "outcome_education", need));
    seeds.push(seedFrom(s, "label_deconstruction", need));
  }

  // Attributes first — richest grounded education from discovery opportunities.
  for (const s of eligible.filter((x) => x.kind === "comparison_attribute")) {
    seeds.push(seedFrom(s, "attribute_education", need));
  }
  for (const s of eligible.filter((x) => x.kind === "product_category")) {
    seeds.push(seedFrom(s, "category_education", need));
    seeds.push(seedFrom(s, "product_guide", need));
    seeds.push(seedFrom(s, "evaluate_product", need));
  }

  const byFamily = new Map<string, TopicSubject>();
  for (const s of primary.filter(
    (x) => x.kind === "catalog_product" || x.kind === "ingredient_or_component"
  )) {
    const family = ingredientFamilyKey(s.label);
    const existing = byFamily.get(family);
    byFamily.set(
      family,
      existing ? preferCanonicalIngredient(existing, s) : s
    );
  }
  for (const s of byFamily.values()) {
    seeds.push(seedFrom(s, "product_guide", need));
    seeds.push(seedFrom(s, "evaluate_product", need));
  }

  // Enough headroom for distinct ingredient families after category frames.
  return dedupeSeeds(seeds).slice(0, 24);
};
