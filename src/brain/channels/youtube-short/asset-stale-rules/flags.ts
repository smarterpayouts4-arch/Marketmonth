import type { SceneCard } from "@/brain/content-studio/schemas/format-package";

import { textEq } from "./internal";
import type { SceneStaleFlags } from "./types";

/**
 * Derive which assets become stale when scene source fields change.
 * Rules (manual Short production loop):
 * - onScreenText → composedVideo
 * - narration → voice, composedVideo
 * - visualPrompt / assetType → render, video, composedVideo
 * - motionPrompt → video, composedVideo
 */
export function computeSceneStaleFlags(
  before: SceneCard,
  after: SceneCard
): SceneStaleFlags {
  const ostChanged = !textEq(before.onScreenText, after.onScreenText);
  const narrationChanged = !textEq(before.narration, after.narration);
  const visualChanged = !textEq(before.visualPrompt, after.visualPrompt);
  const assetTypeChanged =
    (before.assetType ?? "image") !== (after.assetType ?? "image");
  const motionChanged = !textEq(before.motionPrompt, after.motionPrompt);

  const render = visualChanged || assetTypeChanged;
  const voice = narrationChanged;
  const video = visualChanged || assetTypeChanged || motionChanged;
  const composedVideo =
    ostChanged || narrationChanged || visualChanged || assetTypeChanged || motionChanged;

  return { render, voice, video, composedVideo };
}
