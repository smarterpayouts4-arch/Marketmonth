import type { ContentAtom } from "@/brain/atom/content-atom.schema";
import {
  YOUTUBE_SHORT_DURATION_DEFAULT_SECONDS,
  YOUTUBE_SHORT_DURATION_MAX_SECONDS,
  type ContentFormatPackage,
} from "@/brain/content-studio";

/**
 * Paste-ready prompt for ChatGPT / external video tools.
 * Uses locked atom strategy + selected format package drafts.
 */
export function buildExternalVideoPrompt(args: {
  atom: ContentAtom;
  pkg: ContentFormatPackage | null;
  imagePrompt: string;
  voiceoverPrompt: string;
  script: string;
}): string {
  const { atom, pkg, imagePrompt, voiceoverPrompt, script } = args;
  const formatLabel =
    pkg?.formatId === "youtube_video"
      ? "YouTube Video (16:9, ~3–8 min)"
      : `YouTube Short (9:16, default ${YOUTUBE_SHORT_DURATION_DEFAULT_SECONDS}s, max ${YOUTUBE_SHORT_DURATION_MAX_SECONDS}s)`;
  const hook =
    pkg && "hook" in pkg
      ? pkg.hook
      : pkg && "openingHook" in pkg
        ? pkg.openingHook
        : atom.kernel.hook_strategy.opening_intent;
  const scenes =
    pkg?.scenes
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(
        (s, i) =>
          `${i + 1}. (${Math.round(s.durationSeconds)}s) ${s.onScreenText || "Scene"} — ${s.narration}`
      )
      .join("\n") ?? "(no scenes yet)";

  return [
    "You are a short-form / YouTube video writer and shot planner.",
    "Use ONLY the strategy and facts below. Do not invent medical claims, stats, or proof.",
    "",
    `FORMAT: ${formatLabel}`,
    `TOPIC: ${atom.lineage.masterTitle}`,
    `ANGLE: ${atom.lineage.angle.replaceAll("_", " ")}`,
    "",
    "STRATEGY (Content Atom — locked facts)",
    `- Audience problem: ${atom.kernel.audience_problem}`,
    `- Core tension: ${atom.kernel.core_tension}`,
    `- Central claim: ${atom.kernel.central_claim.canonical_wording || atom.kernel.central_claim.meaning}`,
    `- Belief shift: ${atom.kernel.belief_shift.from} → ${atom.kernel.belief_shift.to}`,
    `- Payoff: ${atom.kernel.payoff}`,
    `- Intended action: ${atom.kernel.intended_action}`,
    `- Opening hook intent: ${hook}`,
    "",
    "CURRENT DRAFT FIELDS (improve or rewrite within strategy)",
    `Image / visual prompt:\n${imagePrompt.trim() || "(empty)"}`,
    "",
    `Voiceover direction:\n${voiceoverPrompt.trim() || "(empty)"}`,
    "",
    `Script:\n${script.trim() || "(empty)"}`,
    "",
    "Scene storyboard:",
    scenes,
    "",
    "TASK",
    "1) Rewrite a stronger hook, voiceover, and on-screen text for this format.",
    "2) Keep claims grounded in the strategy — no new evidence.",
    "3) Return: Hook, Full script, Scene list (duration + visual + narration), Image prompt for first frame.",
  ].join("\n");
}
