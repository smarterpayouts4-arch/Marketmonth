import type { TopicSubjectKind } from "../../subjects/types";
import { POSITIVE_INGREDIENT_TOKEN_RE } from "../../subjects/ingredient-patterns";

import type { TopicTitleHookContext } from "./types";

/** Acronyms / catalog-style tokens that keep their casing in mid-sentence copy. */
const PRESERVE_CASING_RE =
  /^(Omega-?3|Vitamin\s+[A-Z]\d?[a-z]*|Vitamin\s+C)$/i;

/**
 * Presentation noun for mid-sentence shells.
 * Never mutates the canonical seed.subject — display only.
 */
export function displayNoun(
  label: string,
  kind?: TopicSubjectKind
): string {
  const t = label.trim().replace(/\s+/g, " ");
  if (!t) return t;
  if (PRESERVE_CASING_RE.test(t)) {
    // Normalize Omega-3 spelling; keep Vitamin D3 style
    if (/^omega-?3$/i.test(t)) return "Omega-3";
    return t;
  }
  if (
    kind === "ingredient_or_component" ||
    kind === "catalog_product" ||
    POSITIVE_INGREDIENT_TOKEN_RE.test(t)
  ) {
    return t.toLowerCase();
  }
  if (kind === "product_category") {
    return t.toLowerCase();
  }
  // Generic mid-sentence: prefer lowercase unless multi-word brand-like
  if (/^[A-Z][a-z]+$/.test(t) && t.length <= 24) {
    return t.toLowerCase();
  }
  return t;
}

/**
 * Neutral ungrounded fallback. Never an industry-specific noun like
 * "label check" — retail framing must be earned by a grounded attribute.
 */
export const NEUTRAL_ACTION_FALLBACK = "key details";

/**
 * Prefer typed comparisonAttribute → actionObject → neutral fallback.
 * Never invent attributes; avoid vague "label detail".
 */
export function concreteAction(ctx: TopicTitleHookContext): string {
  const attr = ctx.comparisonAttribute?.trim();
  if (attr && !/^label detail$/i.test(attr)) {
    return attr;
  }
  const action = ctx.actionObject?.trim();
  if (
    action &&
    !/^label detail$/i.test(action) &&
    action.toLowerCase() !== "label detail"
  ) {
    return action;
  }
  return NEUTRAL_ACTION_FALLBACK;
}

export function hasConcreteGroundedAttribute(
  ctx: TopicTitleHookContext
): boolean {
  const a = concreteAction(ctx);
  return (
    a !== NEUTRAL_ACTION_FALLBACK && a !== "label" && a !== "label check"
  );
}

/** Attribute payoff when educational Why/The passthrough would stay flat. */
export function groundedAttributePayoffTitle(
  ctx: TopicTitleHookContext
): string | null {
  const attr = ctx.comparisonAttribute?.trim();
  if (!attr) return null;
  const lower = attr.toLowerCase();
  // Reflect the grounded attribute itself — never invent an industry noun.
  if (lower === "price per serving" || lower === "serving size" || lower === "form") {
    return `${attr[0].toUpperCase()}${attr.slice(1)} can change how two options compare`;
  }
  if (attr.length >= 3 && attr.length <= 48) {
    return `Why ${attr} changes how options compare`;
  }
  return null;
}
