import { wordSafeClamp as clamp } from "@/brain/lib/word-safe-clamp";

import type { ContentAtom } from "../content-atom.schema";
import { computeMessageHash } from "../content-atom.schema";
import type { CraftPolishResult } from "./types";

/**
 * Merge craft-polish prose into atom. Evidence IDs / claim IDs untouched.
 */
export function applyAtomCraftPolish(
  atom: ContentAtom,
  polish: CraftPolishResult
): ContentAtom {
  const f = polish.fields;
  const angle = atom.lineage.angle;
  const mod = atom.narrativeModules[angle];

  const next: ContentAtom = {
    ...atom,
    kernel: {
      ...atom.kernel,
      audience_problem: clamp(f.audience_problem || atom.kernel.audience_problem, 600),
      why_problem_exists: clamp(
        f.why_problem_exists || atom.kernel.why_problem_exists,
        800
      ),
      core_tension: clamp(f.core_tension || atom.kernel.core_tension, 600),
      central_claim: {
        ...atom.kernel.central_claim,
        meaning: clamp(
          f.central_claim || atom.kernel.central_claim.meaning,
          400
        ),
        canonical_wording: clamp(
          f.central_claim || atom.kernel.central_claim.canonical_wording,
          400
        ),
      },
      resolution: clamp(f.resolution || atom.kernel.resolution, 400),
      payoff: clamp(f.payoff || atom.kernel.payoff, 600),
      intended_action: clamp(
        f.intended_action || atom.kernel.intended_action,
        280
      ),
      hook_strategy: {
        ...atom.kernel.hook_strategy,
        planted_question: clamp(
          f.planted_question || atom.kernel.hook_strategy.planted_question,
          280
        ),
        opening_intent: clamp(
          f.opening_intent || atom.kernel.hook_strategy.opening_intent,
          400
        ),
        resolution: clamp(
          f.hook_resolution || atom.kernel.hook_strategy.resolution,
          400
        ),
      },
    },
    narrativeModules: mod
      ? {
          ...atom.narrativeModules,
          [angle]: {
            ...mod,
            framework:
              f.framework && f.framework.length > 0
                ? f.framework.map((s) => clamp(s, 500)).slice(0, 12)
                : mod.framework,
            steps:
              f.steps && f.steps.length > 0
                ? f.steps.map((s) => clamp(s, 500)).slice(0, 12)
                : mod.steps,
            comparisonCriteria:
              f.comparison_criteria && f.comparison_criteria.length > 0
                ? f.comparison_criteria.map((s) => clamp(s, 500)).slice(0, 12)
                : mod.comparisonCriteria,
          },
        }
      : atom.narrativeModules,
    distributionContract: {
      ...atom.distributionContract,
      ctaIntent: clamp(
        f.ctaIntent || atom.distributionContract.ctaIntent || "",
        280
      ),
    },
  };

  next.message_hash = computeMessageHash(next);
  return next;
}
