import {
  renderStepLockKey,
  withRenderStepLock,
} from "./render-step-lock";

import { assembleYouTubeShortFinalLocked } from "./assemble-final-short/assemble-final-short";
import type {
  AssembleFinalShortDeps,
  AssembleFinalShortInput,
  AssembleFinalShortResult,
} from "./assemble-final-short/types";

export type {
  AssembleFinalShortDeps,
  AssembleFinalShortInput,
  AssembleFinalShortResult,
} from "./assemble-final-short/types";

/**
 * Assemble all ready scene composed MP4s into one final Short for manual download.
 * Re-encodes to canonical 1080×1920 H.264/AAC (see ffmpeg-concat-scenes).
 */
export async function assembleYouTubeShortFinal(
  input: AssembleFinalShortInput,
  deps: AssembleFinalShortDeps = {}
): Promise<AssembleFinalShortResult> {
  return withRenderStepLock(
    renderStepLockKey("assemble", input.atomId.trim()),
    () => assembleYouTubeShortFinalLocked(input, deps)
  );
}
