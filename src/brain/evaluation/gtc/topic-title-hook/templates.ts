import type { TopicCategoryId } from "@/brain/content/topic-category";

import { clamp } from "../text";

import {
  concreteAction,
  displayNoun,
  groundedAttributePayoffTitle,
  hasConcreteGroundedAttribute,
} from "./display-copy";
import {
  buildTopicTitleHookContext,
  isPluralCategoryLabel,
  singularForOneCheck,
} from "./hook-context";
import type { TopicSubjectKind } from "../../subjects/types";

import type { TopicTitleHookContext, TopicTitleItchType } from "./types";
import type { TopicSeed } from "../../objective-topic-strategies";

type Hooked = { title: string; itchType: TopicTitleItchType };

type ShellFamily = "product_education_check" | "brand_safe" | "neutral";

/**
 * P2.3 subject-kind-conditioned shell families: buy/compare "check" shells
 * only fit subjects a buyer actually compares (catalog, attributes,
 * criteria). Trust, FAQ, outcome, and brand subjects get neutral/brand-safe
 * families — no retail framing on non-retail subjects.
 */
const KIND_SHELL_FAMILIES: Record<TopicSubjectKind, readonly ShellFamily[]> = {
  catalog_product: ["product_education_check", "neutral", "brand_safe"],
  product_category: ["product_education_check", "neutral", "brand_safe"],
  ingredient_or_component: ["product_education_check", "neutral", "brand_safe"],
  comparison_attribute: ["product_education_check", "neutral", "brand_safe"],
  decision_criterion: ["product_education_check", "neutral", "brand_safe"],
  health_outcome: ["neutral", "brand_safe"],
  audience_problem: ["neutral", "brand_safe"],
  faq_topic: ["neutral", "brand_safe"],
  platform_capability: ["brand_safe", "neutral"],
  brand_position: ["brand_safe", "neutral"],
  trust_method: ["brand_safe", "neutral"],
};

function shellFamiliesForKind(
  kind: TopicSubjectKind
): readonly ShellFamily[] {
  return KIND_SHELL_FAMILIES[kind] ?? ["neutral", "brand_safe"];
}

type Shell = {
  itchType: TopicTitleItchType;
  family: ShellFamily;
  build: (ctx: TopicTitleHookContext) => string | null;
};

function articleA(noun: string): string {
  return /^[aeiou]/i.test(noun) ? "an" : "a";
}

function nounForShell(ctx: TopicTitleHookContext): string {
  return displayNoun(ctx.primaryLabel, ctx.primaryKind);
}

/** PE label-check / buy-check patterns banned for offers_conversion unless attr-grounded. */
const PE_SHELL_PHRASE_RE =
  /\b(before you buy|check the label|label check|price per serving|serving size|buying\s+.+\?\s*check this|comparison trap before you buy)\b/i;

function hasGroundedComparisonAttribute(ctx: TopicTitleHookContext): boolean {
  return Boolean(ctx.comparisonAttribute?.trim());
}

function shellAllowedForObjective(
  objective: TopicCategoryId,
  seed: TopicSeed,
  ctx: TopicTitleHookContext,
  shell: Shell,
  title: string
): boolean {
  if (objective !== "offers_conversion") return true;

  const attrOk =
    seed.subjectType === "comparison_attribute" &&
    hasGroundedComparisonAttribute(ctx);

  if (shell.family === "product_education_check" && !attrOk) {
    return false;
  }
  if (PE_SHELL_PHRASE_RE.test(title) && !attrOk) {
    return false;
  }
  return true;
}

const SHELLS: Shell[] = [
  {
    itchType: "ability_cue",
    family: "product_education_check",
    build: (ctx) => {
      const noun = nounForShell(ctx);
      if (!noun) return null;
      if (ctx.comparisonAttribute) {
        return `Before you compare ${noun}, check the ${ctx.comparisonAttribute}`;
      }
      if (isPluralCategoryLabel(ctx.primaryLabel)) {
        const one = singularForOneCheck(ctx.primaryLabel);
        // Retail label framing only when a comparison attribute grounds it.
        return `Before you choose ${articleA(one)} ${displayNoun(one, ctx.primaryKind)}, check one thing first`;
      }
      return `Before comparing ${noun}, check one thing first`;
    },
  },
  {
    itchType: "ability_cue",
    family: "product_education_check",
    build: (ctx) => {
      const noun = nounForShell(ctx);
      if (!noun) return null;
      if (ctx.comparisonAttribute === "price per serving") {
        return `Before choosing the cheaper option, compare the price per serving`;
      }
      if (hasConcreteGroundedAttribute(ctx)) {
        return `Before comparing ${noun}, check the ${concreteAction(ctx)}`;
      }
      // Never "One Magnesium check"; no ungrounded label-check framing.
      return `Before comparing ${noun}, know what actually differs`;
    },
  },
  {
    itchType: "anticipation",
    family: "product_education_check",
    build: (ctx) => {
      const noun = nounForShell(ctx);
      if (!noun) return null;
      // Require a concrete grounded attribute — never "Check this label detail"
      if (!hasConcreteGroundedAttribute(ctx)) return null;
      const action = concreteAction(ctx);
      return `Buying ${noun}? Check the ${action} before choosing`;
    },
  },
  {
    itchType: "anticipation",
    family: "neutral",
    build: (ctx) => {
      const noun = nounForShell(ctx);
      if (!noun) return null;
      if (hasConcreteGroundedAttribute(ctx)) {
        return `${noun} can look straightforward—until you compare the ${concreteAction(ctx)}`;
      }
      return `${noun} can look straightforward—until you compare options carefully`;
    },
  },
  {
    itchType: "missing_detail",
    family: "product_education_check",
    build: (ctx) => {
      const noun = nounForShell(ctx);
      if (!noun) return null;
      if (hasConcreteGroundedAttribute(ctx)) {
        return `The ${noun} ${concreteAction(ctx)} that can change how two options compare`;
      }
      return `The ${noun} difference that can change your comparison`;
    },
  },
  {
    itchType: "uncertainty",
    family: "product_education_check",
    build: (ctx) => {
      if (ctx.comparisonAttribute === "price per serving") {
        return `The price-per-serving check that can change which option looks cheaper`;
      }
      const noun = nounForShell(ctx);
      if (!noun) return null;
      if (hasConcreteGroundedAttribute(ctx)) {
        return `The ${concreteAction(ctx)} check that can change which option looks clearer`;
      }
      // Skip vague "comparison trap before you buy" without attr grounding
      return null;
    },
  },
  {
    itchType: "uncertainty",
    family: "brand_safe",
    build: (ctx) => {
      const noun = nounForShell(ctx);
      if (!noun) return null;
      // Grammatical subject is "comparing X" (singular activity) → always "gets"
      return `Why comparing ${noun} gets more confusing the more options you see`;
    },
  },
  {
    itchType: "missing_detail",
    family: "brand_safe",
    build: (ctx) => {
      const noun = nounForShell(ctx);
      if (!noun) return null;
      return `The ${noun} problem buyers notice too late`;
    },
  },
];

function shellEligible(
  ctx: TopicTitleHookContext,
  framedTitle: string
): boolean {
  if (!ctx.primaryLabel) return false;
  if (/^(how|what|why|help|helping)\b/i.test(ctx.primaryLabel)) return false;
  if (
    /^(The |Why |One )/i.test(framedTitle) &&
    !/^What to (know|check) /i.test(framedTitle)
  ) {
    return false;
  }
  return true;
}

function tryAttributePayoff(
  seed: TopicSeed,
  ctx: TopicTitleHookContext
): Hooked | null {
  if (seed.subjectType !== "comparison_attribute" && !ctx.comparisonAttribute) {
    return null;
  }
  const payoff = groundedAttributePayoffTitle(ctx);
  if (!payoff) return null;
  return { title: clamp(payoff, 90), itchType: "ability_cue" };
}

/**
 * Hooked external-trigger templates from typed hook context.
 * Brand awareness cannot use PE buy/label shells unless comparison_attribute.
 */
export function deterministicHookedTitle(
  seed: TopicSeed,
  framedTitle: string,
  rankIndex: number,
  usedTitles: Set<string> | undefined,
  objective: TopicCategoryId
): Hooked {
  const ctx = buildTopicTitleHookContext(seed);

  if (
    !ctx.primaryLabel ||
    /^(how|what|why|help|helping)\b/i.test(ctx.primaryLabel)
  ) {
    const payoff = tryAttributePayoff(seed, ctx);
    if (payoff && !usedTitles?.has(payoff.title.toLowerCase())) {
      return payoff;
    }
    return { title: clamp(framedTitle, 90), itchType: "passthrough" };
  }

  if (
    /^(The |Why |One )/i.test(framedTitle) &&
    !/^What to (know|check) /i.test(framedTitle)
  ) {
    // Stronger grounded payoff for flat educational Why/The frames
    const payoff = tryAttributePayoff(seed, ctx);
    if (payoff && !usedTitles?.has(payoff.title.toLowerCase())) {
      return payoff;
    }
    return { title: clamp(framedTitle, 90), itchType: "passthrough" };
  }

  const allowedFamilies = shellFamiliesForKind(seed.subjectType);
  const n = SHELLS.length;
  for (let offset = 0; offset < n; offset++) {
    const idx = (rankIndex + offset) % n;
    const shell = SHELLS[idx]!;
    if (!allowedFamilies.includes(shell.family)) continue;
    if (!shellEligible(ctx, framedTitle)) continue;
    const built = shell.build(ctx);
    if (!built) continue;
    const title = clamp(built, 90);
    if (/One supplements\b/i.test(title)) continue;
    if (/\bOne [A-Z][a-z]+(?:\s+[a-z]+)? check\b/.test(title)) continue;
    if (/\buntil you check this\b/i.test(title)) continue;
    if (/\bcheck this\b/i.test(title)) continue;
    if (/\blabel detail\b/i.test(title)) continue;
    if (/\bmost shoppers\b/i.test(title)) continue;
    if (/\bWhy (?!comparing )\S+ gets\b/i.test(title)) continue;
    if (!shellAllowedForObjective(objective, seed, ctx, shell, title)) {
      continue;
    }
    if (usedTitles?.has(title.toLowerCase())) continue;
    return { title, itchType: shell.itchType };
  }

  const payoff = tryAttributePayoff(seed, ctx);
  if (payoff && !usedTitles?.has(payoff.title.toLowerCase())) {
    return payoff;
  }

  return { title: clamp(framedTitle, 90), itchType: "passthrough" };
}
