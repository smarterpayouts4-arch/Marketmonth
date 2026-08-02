import type { ContentFormatPackage } from "@/brain/content-studio";

import type { SceneEditFields } from "../../../hooks/use-atom-content-studio";
import type { RenderBusyMap } from "../../../hooks/use-atom-content-studio/render-busy";
import type {
  FullGenerateProgress,
  FullGenerateStepId,
} from "../../../hooks/use-atom-content-studio/use-studio-edit-actions";

export type StatusTone = "success" | "neutral" | "danger" | "muted" | "warning";

export type StatusBadgeState = {
  tone: StatusTone;
  label: string;
};

export type AssetActionState = {
  imageBusy: boolean;
  voiceBusy: boolean;
  videoBusy: boolean;
  composeBusy: boolean;
  fullBusy: boolean;
  anyBusy: boolean;
  motionPrompt: string;
  showMotionPrompt: boolean;
  hasDurableImage: boolean;
  durableDryRunOk: boolean;
  durableFailed: boolean;
  liveSucceeded: boolean;
  imageStale: boolean;
  actionDisabledReason: string | null;
  actionDisabled: boolean;
  actionLabel: string;
  imageStatus: StatusBadgeState;
  durableRender:
    | (ContentFormatPackage["scenes"][number] extends infer S
        ? S extends { render?: infer R }
          ? R
          : never
        : never)
    | undefined;
  hasVoiceAudio: boolean;
  voiceSucceeded: boolean;
  voiceStale: boolean;
  voiceFailed: boolean;
  voiceDisabledReason: string | null;
  voiceDisabled: boolean;
  voiceLabel: string;
  voiceErrorMessage: string;
  voiceStatus: StatusBadgeState;
  durableVoice:
    | (ContentFormatPackage["scenes"][number] extends infer S
        ? S extends { voice?: infer V }
          ? V
          : never
        : never)
    | undefined;
  hasVideoClip: boolean;
  videoStale: boolean;
  videoSucceeded: boolean;
  videoDisabledReason: string | null;
  videoDisabled: boolean;
  videoLabel: string;
  durableVideo:
    | (ContentFormatPackage["scenes"][number] extends infer S
        ? S extends { video?: infer V }
          ? V
          : never
        : never)
    | undefined;
  hasComposedMp4: boolean;
  composeSucceeded: boolean;
  composeStale: boolean;
  composeDisabledReason: string | null;
  composeDisabled: boolean;
  composeLabel: string;
  composeStatus: StatusBadgeState;
  durableComposed:
    | (ContentFormatPackage["scenes"][number] extends infer S
        ? S extends { composedVideo?: infer C }
          ? C
          : never
        : never)
    | undefined;
  completeDisabledReason: string | null;
  completeDisabled: boolean;
  showFullGenerateStepper: boolean;
  stepperIds: FullGenerateStepId[];
};

export type ComputeAssetActionStateInput = {
  pkg: ContentFormatPackage;
  selectedSceneId: string;
  sceneEdits: SceneEditFields;
  dirty: boolean;
  renderBusy?: boolean;
  renderBusyMap?: RenderBusyMap;
  fullGenerateProgress?: FullGenerateProgress | null;
  onValidateImageRender?: () => void | Promise<boolean>;
  onGenerateSceneVoice?: () => void | Promise<boolean>;
  onGenerateSceneVideo?: () => void | Promise<boolean>;
  onComposeSceneMp4?: () => void | Promise<boolean>;
  onGenerateCompleteScene?: () => void | Promise<boolean>;
};

export function computeAssetActionState({
  pkg,
  selectedSceneId,
  sceneEdits,
  dirty,
  renderBusy = false,
  renderBusyMap = {},
  fullGenerateProgress = null,
  onValidateImageRender,
  onGenerateSceneVoice,
  onGenerateSceneVideo,
  onComposeSceneMp4,
  onGenerateCompleteScene,
}: ComputeAssetActionStateInput): AssetActionState {
  const imageBusy = Boolean(renderBusyMap.image || renderBusyMap.full);
  const voiceBusy = Boolean(renderBusyMap.voice || renderBusyMap.full);
  const videoBusy = Boolean(renderBusyMap.video || renderBusyMap.full);
  const composeBusy = Boolean(renderBusyMap.compose || renderBusyMap.full);
  const fullBusy = Boolean(renderBusyMap.full);
  const anyBusy = renderBusy || imageBusy || voiceBusy || videoBusy || composeBusy;

  const selectedScene = pkg.scenes.find((s) => s.id === selectedSceneId);
  const motionPrompt = sceneEdits.motionPrompt ?? "";
  /** Domain assetType is "image" | "video" — show Motion Prompt only for video. */
  const showMotionPrompt = sceneEdits.assetType === "video";

  const durableRender =
    selectedScene && "render" in selectedScene
      ? selectedScene.render
      : undefined;
  const hasDurableImage = Boolean(durableRender?.assetUrl);
  const durableDryRunOk =
    durableRender?.status === "dry_run_succeeded" && !hasDurableImage;
  const durableFailed = durableRender?.status === "failed";
  const liveSucceeded = durableRender?.status === "succeeded" && hasDurableImage;
  const imageStale = durableRender?.status === "stale" && hasDurableImage;

  const actionDisabledReason = !sceneEdits.visualPrompt.trim()
    ? "Add a visual prompt first"
    : dirty
      ? "Save this scene before generating its image."
      : imageBusy
        ? "Generating image…"
        : null;
  const actionDisabled =
    Boolean(actionDisabledReason) || !onValidateImageRender;
  const actionLabel = imageBusy
    ? "Generating…"
    : imageStale || durableFailed
      ? "Retry Image"
      : hasDurableImage
        ? "Regenerate Image"
        : "Generate Image";

  const durableVoice =
    selectedScene && "voice" in selectedScene
      ? selectedScene.voice
      : undefined;
  const hasVoiceAudio = Boolean(durableVoice?.assetUrl);
  const voiceSucceeded =
    durableVoice?.status === "succeeded" && hasVoiceAudio;
  const voiceStale = durableVoice?.status === "stale" && hasVoiceAudio;
  const voiceFailed = durableVoice?.status === "failed";
  const voiceDisabledReason = !sceneEdits.narration.trim()
    ? "Add narration first"
    : dirty
      ? "Save this scene before generating voice."
      : voiceBusy
        ? "Generating voice…"
        : null;
  const voiceDisabled =
    Boolean(voiceDisabledReason) || !onGenerateSceneVoice;
  const voiceLabel = voiceBusy
    ? "Generating…"
    : voiceStale || voiceFailed
      ? "Retry Voice"
      : hasVoiceAudio
        ? "Regenerate Voice"
        : "Generate Voice";
  const voiceErrorMessage = durableVoice?.error?.message ?? "";

  const durableVideo =
    selectedScene && "video" in selectedScene
      ? selectedScene.video
      : undefined;
  const hasVideoClip = Boolean(durableVideo?.assetUrl);
  const videoStale = durableVideo?.status === "stale" && hasVideoClip;
  const videoSucceeded =
    durableVideo?.status === "succeeded" && hasVideoClip;
  const videoDisabledReason = !motionPrompt.trim()
    ? "Add and save Motion Prompt instructions before generating video."
    : !hasDurableImage || imageStale
      ? imageStale
        ? "Still is outdated — regenerate image before video."
        : "Generate a scene image first — video needs a saved still"
      : dirty
        ? "Save this scene before generating video."
        : videoBusy
          ? "Generating video…"
          : null;
  const videoDisabled =
    Boolean(videoDisabledReason) || !onGenerateSceneVideo;
  const videoLabel = videoBusy
    ? "Generating…"
    : videoStale || durableVideo?.status === "failed"
      ? "Retry Video"
      : hasVideoClip
        ? "Regenerate Video"
        : "Generate Video";

  const durableComposed =
    selectedScene && "composedVideo" in selectedScene
      ? selectedScene.composedVideo
      : undefined;
  const hasComposedMp4 = Boolean(durableComposed?.assetUrl);
  const composeSucceeded =
    durableComposed?.status === "succeeded" && hasComposedMp4;
  const composeStale = durableComposed?.status === "stale" && hasComposedMp4;
  const composeDisabledReason =
    sceneEdits.assetType === "video" && (!hasVideoClip || videoStale)
      ? videoStale
        ? "Motion is outdated — regenerate video before composing."
        : "Generate scene video first — Final Scene Video needs approved motion"
      : !hasDurableImage || imageStale
        ? imageStale
          ? "Still is outdated — regenerate image before composing."
          : "Generate a scene image first"
        : !hasVoiceAudio || voiceStale
          ? voiceStale
            ? "Voice is outdated — regenerate voice before composing."
            : "Generate scene voice first"
          : dirty
            ? "Save this scene before composing the MP4."
            : composeBusy
              ? "Composing…"
              : null;
  const composeDisabled =
    Boolean(composeDisabledReason) || !onComposeSceneMp4;
  const composeLabel = composeBusy
    ? "Composing…"
    : composeStale || durableComposed?.status === "failed"
      ? "Retry Scene MP4"
      : hasComposedMp4
        ? "Regenerate Scene MP4"
        : "Create Scene MP4";

  const completeDisabledReason = !sceneEdits.visualPrompt.trim()
    ? "Add a visual prompt first"
    : !sceneEdits.narration.trim()
      ? "Add narration first"
      : sceneEdits.assetType === "video" && !motionPrompt.trim()
        ? "Add Motion Prompt instructions before generating the complete scene."
        : anyBusy
          ? "Busy…"
          : null;
  const completeDisabled =
    Boolean(completeDisabledReason) || !onGenerateCompleteScene;
  const showFullGenerateStepper =
    Boolean(fullGenerateProgress?.active) ||
    Boolean(fullGenerateProgress?.error) ||
    (fullGenerateProgress != null &&
      Object.values(fullGenerateProgress.steps).some(
        (s) => s === "done" || s === "reused" || s === "error"
      ));
  const stepperIds: FullGenerateStepId[] =
    sceneEdits.assetType === "video"
      ? ["save", "image", "voice", "veo", "compose"]
      : ["save", "image", "voice", "compose"];

  const imageStatus = (() => {
    if (imageBusy) {
      return { tone: "muted" as const, label: "Generating…" };
    }
    if (imageStale) {
      return { tone: "warning" as const, label: "Outdated" };
    }
    if (liveSucceeded) {
      return { tone: "success" as const, label: "Ready" };
    }
    if (durableFailed) {
      return { tone: "danger" as const, label: "Failed" };
    }
    if (durableDryRunOk) {
      return { tone: "neutral" as const, label: "Path verified" };
    }
    return { tone: "neutral" as const, label: "Not generated" };
  })();

  const voiceStatus = (() => {
    if (voiceBusy) {
      return { tone: "muted" as const, label: "Working…" };
    }
    if (voiceStale) {
      return { tone: "warning" as const, label: "Outdated" };
    }
    if (voiceSucceeded) {
      if (
        durableVoice?.durationSeconds != null &&
        durableVoice.durationSeconds > 0
      ) {
        return {
          tone: "success" as const,
          label: `Ready • ${durableVoice.durationSeconds.toFixed(2)}s`,
        };
      }
      return { tone: "success" as const, label: "Ready • Duration Unverified" };
    }
    if (durableVoice?.status === "stubbed") {
      return { tone: "neutral" as const, label: "Stubbed" };
    }
    if (voiceFailed) {
      return { tone: "danger" as const, label: "Failed" };
    }
    return { tone: "neutral" as const, label: "Not generated" };
  })();

  const composeStatus = (() => {
    if (composeStale) {
      return {
        tone: "warning" as const,
        label: "Outdated — Recompose required",
      };
    }
    if (composeSucceeded) {
      if (
        durableComposed?.durationSeconds != null &&
        durableComposed.durationSeconds > 0
      ) {
        return {
          tone: "success" as const,
          label: `Ready • ${durableComposed.durationSeconds.toFixed(2)}s`,
        };
      }
      return { tone: "success" as const, label: "Ready" };
    }
    if (durableComposed?.status === "stubbed") {
      return { tone: "neutral" as const, label: "Stubbed" };
    }
    if (durableComposed?.status === "failed") {
      return { tone: "danger" as const, label: "Failed" };
    }
    return { tone: "neutral" as const, label: "Not created" };
  })();

  return {
    imageBusy,
    voiceBusy,
    videoBusy,
    composeBusy,
    fullBusy,
    anyBusy,
    motionPrompt,
    showMotionPrompt,
    hasDurableImage,
    durableDryRunOk,
    durableFailed,
    liveSucceeded,
    imageStale,
    actionDisabledReason,
    actionDisabled,
    actionLabel,
    imageStatus,
    durableRender,
    hasVoiceAudio,
    voiceSucceeded,
    voiceStale,
    voiceFailed,
    voiceDisabledReason,
    voiceDisabled,
    voiceLabel,
    voiceErrorMessage,
    voiceStatus,
    durableVoice,
    hasVideoClip,
    videoStale,
    videoSucceeded,
    videoDisabledReason,
    videoDisabled,
    videoLabel,
    durableVideo,
    hasComposedMp4,
    composeSucceeded,
    composeStale,
    composeDisabledReason,
    composeDisabled,
    composeLabel,
    composeStatus,
    durableComposed,
    completeDisabledReason,
    completeDisabled,
    showFullGenerateStepper,
    stepperIds,
  };
}
