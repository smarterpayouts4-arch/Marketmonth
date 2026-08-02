import { composeEffectiveVeoPrompt } from "./compose-effective-veo-prompt";
import type { SceneCard } from "./schemas/format-package";

export type SceneFullGenerateEdits = {
  visualPrompt: string;
  narration: string;
  onScreenText: string;
  motionPrompt: string;
  assetType: "image" | "video";
};

export type SceneFullGenerateStep = "reuse" | "generate" | "skip";

export type SceneFullGeneratePlan = {
  save: boolean;
  image: SceneFullGenerateStep;
  voice: SceneFullGenerateStep;
  veo: SceneFullGenerateStep;
  compose: SceneFullGenerateStep;
};

function trimEq(a: string | undefined, b: string | undefined): boolean {
  return (a ?? "").trim() === (b ?? "").trim();
}

function hasSucceededUrl(
  status: string | undefined,
  url: string | undefined
): boolean {
  return status === "succeeded" && Boolean(url?.trim());
}

/**
 * Soft-compare reuse planner for Generate Complete Scene.
 * Client-safe (no node:crypto). Cascade forces downstream regen.
 */
export function planSceneFullGenerate(input: {
  scene: SceneCard;
  target: SceneFullGenerateEdits;
  needsSave: boolean;
  /** Package-level GVS dirty — forces image (effective prompt includes GVS). */
  styleChanged?: boolean;
}): SceneFullGeneratePlan {
  const { scene, target, needsSave, styleChanged = false } = input;
  const assetType = target.assetType;

  const render = scene.render;
  const voice = scene.voice;
  const video = scene.video;
  const composed = scene.composedVideo;

  const image: SceneFullGenerateStep =
    !styleChanged &&
    hasSucceededUrl(render?.status, render?.assetUrl) &&
    trimEq(render?.visualPromptUsed, target.visualPrompt) &&
    (render?.assetTypeUsed ?? "image") === assetType
      ? "reuse"
      : "generate";

  const voiceStep: SceneFullGenerateStep =
    hasSucceededUrl(voice?.status, voice?.assetUrl) &&
    trimEq(voice?.scriptUsed, target.narration)
      ? "reuse"
      : "generate";

  const expectedVeoPrompt = composeEffectiveVeoPrompt({
    motionPrompt: target.motionPrompt,
    visualPrompt: target.visualPrompt,
  });
  const stillUrl = render?.assetUrl?.trim() || "";

  let veo: SceneFullGenerateStep =
    assetType === "image"
      ? "skip"
      : hasSucceededUrl(video?.status, video?.assetUrl) &&
          trimEq(video?.promptUsed, expectedVeoPrompt) &&
          trimEq(video?.sourceImageUrl, stillUrl) &&
          image === "reuse"
        ? "reuse"
        : "generate";

  const plateUrl =
    assetType === "video"
      ? video?.assetUrl?.trim() || ""
      : stillUrl;
  const composedVisualOk = composed?.sourceVisualUrl
    ? trimEq(composed.sourceVisualUrl, plateUrl)
    : assetType === "image"
      ? trimEq(composed?.sourceImageUrl, stillUrl)
      : false;

  let compose: SceneFullGenerateStep =
    hasSucceededUrl(composed?.status, composed?.assetUrl) &&
    trimEq(composed?.onScreenTextUsed, target.onScreenText) &&
    trimEq(composed?.voiceScriptUsed, target.narration) &&
    trimEq(composed?.sourceVoiceUrl, voice?.assetUrl) &&
    composedVisualOk &&
    image === "reuse" &&
    voiceStep === "reuse" &&
    (veo === "skip" || veo === "reuse")
      ? "reuse"
      : "generate";

  // Cascade: upstream generate forces downstream generate (not skip).
  if (image === "generate") {
    if (veo !== "skip") veo = "generate";
    compose = "generate";
  }
  if (voiceStep === "generate") {
    compose = "generate";
  }
  if (veo === "generate") {
    compose = "generate";
  }

  return {
    save: needsSave,
    image,
    voice: voiceStep,
    veo,
    compose,
  };
}
