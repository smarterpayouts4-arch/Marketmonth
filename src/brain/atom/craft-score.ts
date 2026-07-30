import { CRAFT_DNA_VERSION } from "@/brain/craft";

import type { ContentAtom } from "./content-atom.schema";

export type AtomCraftReport = {
  craftDnaVersion: typeof CRAFT_DNA_VERSION;
  hookQuality: number;
  storyCraft: number;
  moves: Array<{ id: string; label: string; field: string; excerpt: string }>;
};

function score01(ok: boolean): number {
  return ok ? 1 : 0;
}

/** Deterministic Hook Model score 0–5 (proxy / drift detector). */
export function scoreHookQuality(atom: ContentAtom): number {
  const k = atom.kernel;
  const h = k.hook_strategy;
  const brand = ""; // brand check done separately
  void brand;

  const trigger =
    h.planted_question.trim().length >= 24 &&
    !/^help you\b/i.test(h.opening_intent) &&
    !/^help you\b/i.test(h.planted_question);
  const curiosity =
    /\b(what|why|before|without|still|even when|not the same)\b/i.test(
      h.planted_question
    ) || /\?/.test(h.planted_question);
  const resolutionPays =
    h.resolution.trim().length >= 40 &&
    (k.payoff.trim().length >= 40 || k.resolution.trim().length >= 40);
  const specificity =
    k.core_tension.trim().length >= 60 &&
    !/\b(help you build|routine you can trust)\b/i.test(h.opening_intent);
  const actionComplete =
    k.intended_action.trim().length >= 24 &&
    !k.intended_action.trim().endsWith("…") &&
    !k.intended_action.trim().endsWith("...");

  const raw =
    score01(trigger) +
    score01(curiosity) +
    score01(resolutionPays) +
    score01(specificity) +
    score01(actionComplete);
  return raw; // 0–5
}

/** Deterministic storytelling craft score 0–5. */
export function scoreStoryCraft(atom: ContentAtom): number {
  const k = atom.kernel;
  const mod = atom.narrativeModules[atom.lineage.angle];
  const blob = [
    k.audience_problem,
    k.core_tension,
    k.why_problem_exists,
    k.resolution,
    k.payoff,
    mod?.canonicalNarrativeSpine.explanation ?? "",
    mod?.canonicalNarrativeSpine.keyInsight ?? "",
  ].join(" ");

  const dance = /\b(but|therefore|however|instead)\b/i.test(blob);
  const sentences = blob
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  const lengths = sentences.map((s) => s.split(/\s+/).length);
  const variance =
    lengths.length >= 3 &&
    Math.max(...lengths) - Math.min(...lengths) >= 6;
  const detail = /\b(label|form|price|serving|search|compare|criteria|checklist)\b/i.test(
    blob
  );
  const climax =
    (mod?.canonicalNarrativeSpine.keyInsight ?? "").trim().length >= 40 ||
    k.payoff.trim().length >= 60;
  const retellable =
    k.central_claim.canonical_wording.trim().split(/\s+/).length <= 28 &&
    k.central_claim.canonical_wording.trim().length >= 20;

  return (
    score01(dance) +
    score01(variance) +
    score01(detail) +
    score01(climax) +
    score01(retellable)
  );
}

export function buildAtomCraftReport(atom: ContentAtom): AtomCraftReport {
  const k = atom.kernel;
  return {
    craftDnaVersion: CRAFT_DNA_VERSION,
    hookQuality: scoreHookQuality(atom),
    storyCraft: scoreStoryCraft(atom),
    moves: [
      {
        id: "trigger",
        label: "Trigger",
        field: "kernel.hook_strategy.planted_question / core_tension",
        excerpt: k.hook_strategy.planted_question.slice(0, 160),
      },
      {
        id: "action",
        label: "Action",
        field: "kernel.hook_strategy.opening_intent",
        excerpt: k.hook_strategy.opening_intent.slice(0, 160),
      },
      {
        id: "variable_reward",
        label: "Variable Reward",
        field: "kernel.hook_strategy.resolution / payoff",
        excerpt: (k.hook_strategy.resolution || k.payoff).slice(0, 160),
      },
      {
        id: "investment",
        label: "Investment",
        field: "kernel.intended_action",
        excerpt: k.intended_action.slice(0, 160),
      },
      {
        id: "climax",
        label: "Climax",
        field: "narrative spine keyInsight / payoff",
        excerpt: (
          atom.narrativeModules[atom.lineage.angle]?.canonicalNarrativeSpine
            .keyInsight || k.payoff
        ).slice(0, 160),
      },
    ],
  };
}
