import type { ContentAtom } from "@/brain/atom";
import type { YouTubeShortFormatPackage } from "@/brain/content-studio/schemas/format-package";

import { youtubeShortDurationPolicyError } from "./duration-policy";
import { visualPromptReservedSectionHeaderError } from "./visual-prompt-section-headers";

export function validateShortFormatPackage(
  output: YouTubeShortFormatPackage,
  atom: ContentAtom,
  atomRevision: number
): string[] {
  const errors: string[] = [];
  if (output.atomId !== atom.atom_id) {
    errors.push("package atomId mismatch");
  }
  if (output.atomRevision !== atomRevision) {
    errors.push("package atomRevision mismatch");
  }
  if (output.aspectRatio !== "9:16") {
    errors.push("youtube_short must be 9:16");
  }
  for (const scene of output.scenes) {
    const contamination = visualPromptReservedSectionHeaderError(
      scene.visualPrompt,
      scene.id
    );
    if (contamination) {
      errors.push(contamination);
    }
  }
  const hasAnyFilledScene = output.scenes.some(
    (s) => s.narration.trim() || s.visualPrompt.trim()
  );
  const opening = output.scenes[0];
  const openingBaselineNarration =
    opening &&
    output.generatedBaseline?.scenes?.[opening.id]?.narration?.trim();
  // Manual scaffolding may create empty scenes (Phase 3D/3E). Empty Manual
  // baselines must allow Reset Scene on the opening beat while other scenes
  // still hold durable copy. Only require opening narration when the generated
  // baseline itself had opening narration (produced Shorts).
  if (
    hasAnyFilledScene &&
    openingBaselineNarration &&
    !opening?.narration.trim()
  ) {
    errors.push("opening scene narration required");
  }
  if (
    output.unresolvedResearch.length > 0 &&
    output.status !== "research_required"
  ) {
    errors.push("unresolved research must keep status research_required");
  }
  const durationError = youtubeShortDurationPolicyError(output.durationSeconds);
  if (durationError) {
    errors.push(durationError);
  }
  if (!output.audienceAction.trim()) {
    errors.push("audienceAction required");
  }
  return errors;
}
