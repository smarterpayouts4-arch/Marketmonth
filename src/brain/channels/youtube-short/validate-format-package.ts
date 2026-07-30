import type { ContentAtom } from "@/brain/atom";
import type { YouTubeShortFormatPackage } from "@/brain/content-studio/schemas/format-package";

import { youtubeShortDurationPolicyError } from "./duration-policy";

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
  if (!output.scenes[0]?.narration.trim()) {
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
  for (const s of output.scenes) {
    if (!s.visualPrompt.trim()) {
      errors.push(`scene ${s.id} missing visualPrompt`);
    }
  }
  return errors;
}
