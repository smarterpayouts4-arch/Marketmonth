import { createHash } from "node:crypto";

/** Provider-neutral still exclusions (no model-specific syntax). */
export const SHORT_IMAGE_PROMPT_EXCLUSIONS = [
  "no watermarks",
  "no logos unless already in the brief",
  "no unreadable tiny text",
  "no collage grids",
] as const;

const ASPECT_REQUIREMENT = "Vertical 9:16 frame.";

/**
 * Pure helper: Global Visual Style + scene visualPrompt (+ aspect / exclusions).
 * Preserves the full scene prompt; never truncates.
 */
export function composeEffectiveImagePrompt(
  globalVisualStyle: string | undefined,
  sceneVisualPrompt: string
): string {
  const global = globalVisualStyle?.trim() ?? "";
  const scene = sceneVisualPrompt.trim();
  if (global && scene) return `${global}\n\n${scene}`;
  return global || scene;
}

/**
 * Full Short still prompt used for render input (Phase 4A+).
 */
export function composeShortSceneEffectiveImagePrompt(
  globalVisualStyle: string | undefined,
  sceneVisualPrompt: string
): string {
  const core = composeEffectiveImagePrompt(
    globalVisualStyle,
    sceneVisualPrompt
  );
  if (!core.trim()) return "";

  const exclusionLine = `Avoid: ${SHORT_IMAGE_PROMPT_EXCLUSIONS.join("; ")}.`;
  const parts = [core, ASPECT_REQUIREMENT, exclusionLine];
  return parts.join("\n\n");
}

/** Deterministic hash of the effective prompt (hex sha256). */
export function hashEffectiveImagePrompt(effectivePrompt: string): string {
  return createHash("sha256").update(effectivePrompt, "utf8").digest("hex");
}

/**
 * Deterministic scene content revision for stale-result protection.
 * Based on durable visualPrompt + assetType only (not narration/OST).
 */
export function hashSceneRenderSource(input: {
  visualPrompt: string;
  assetType: string;
}): string {
  const payload = JSON.stringify({
    visualPrompt: input.visualPrompt,
    assetType: input.assetType,
  });
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
