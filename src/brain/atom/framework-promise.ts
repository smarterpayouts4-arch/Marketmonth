import type { ContentAtom } from "./content-atom.schema";

const WORD_TO_NUM: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

/**
 * Detect numbered framework promises ("five checks", "3 steps") in kernel prose.
 * Returns the max promised count, or 0 if none.
 */
export function detectNumberedPromise(atom: ContentAtom): number {
  const blob = [
    atom.kernel.payoff,
    atom.kernel.intended_action,
    atom.kernel.resolution,
    atom.kernel.central_claim.canonical_wording,
    atom.kernel.hook_strategy.opening_intent,
    atom.kernel.hook_strategy.planted_question,
  ].join(" ");

  let max = 0;
  const digitRe =
    /\b(\d+)\s*[- ]?(?:check|checks|step|steps|criteria|criterion|rule|rules)\b/gi;
  for (const m of blob.matchAll(digitRe)) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > max && n <= 12) max = n;
  }
  const wordRe =
    /\b(one|two|three|four|five|six|seven|eight|nine|ten)(?:-|\s+)(?:check|checks|step|steps|criteria|criterion|rule|rules)\b/gi;
  for (const m of blob.matchAll(wordRe)) {
    const n = WORD_TO_NUM[m[1]!.toLowerCase()] ?? 0;
    if (n > max) max = n;
  }
  return max;
}

export function frameworkItemCount(atom: ContentAtom): number {
  const mod = atom.narrativeModules[atom.lineage.angle];
  if (!mod) return 0;
  return Math.max(
    mod.framework.filter((s) => s.trim()).length,
    mod.steps.filter((s) => s.trim()).length,
    mod.comparisonCriteria.filter((s) => s.trim()).length
  );
}

export function frameworkPromiseUnfulfilled(atom: ContentAtom): {
  promised: number;
  delivered: number;
  unfulfilled: boolean;
} {
  const promised = detectNumberedPromise(atom);
  const delivered = frameworkItemCount(atom);
  return {
    promised,
    delivered,
    unfulfilled: promised > 0 && delivered < promised,
  };
}
