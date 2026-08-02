"use client";

import { Video } from "lucide-react";

import { SCENE_MOTION_PROMPT_MAX_CHARS } from "@/brain/content-studio";

import type { SceneAssetType, SceneEditFields } from "../../../hooks/use-atom-content-studio";
import type { AssetActionState } from "./asset-action-state";
import { StatusBadge } from "./status-badge";

export type StillTypeSectionProps = {
  sceneEdits: SceneEditFields;
  fieldsReadOnly: boolean;
  dirty: boolean;
  renderError: string | null;
  renderMessage: string | null;
  state: AssetActionState;
  onSceneAssetTypeChange: (v: SceneAssetType) => void;
  onSceneMotionPromptChange: (v: string) => void;
  onValidateImageRender?: () => void | Promise<boolean>;
  onGenerateSceneVideo?: () => void | Promise<boolean>;
  onClearSceneVideo?: () => void | Promise<boolean>;
};

export function StillTypeSection({
  sceneEdits,
  fieldsReadOnly,
  dirty,
  renderError,
  renderMessage,
  state,
  onSceneAssetTypeChange,
  onSceneMotionPromptChange,
  onValidateImageRender,
  onGenerateSceneVideo,
  onClearSceneVideo,
}: StillTypeSectionProps) {
  const {
    motionPrompt,
    showMotionPrompt,
    durableDryRunOk,
    durableFailed,
    liveSucceeded,
    imageBusy,
    fullBusy,
    actionDisabled,
    actionDisabledReason,
    actionLabel,
    imageStatus,
    durableRender,
    videoStale,
    videoSucceeded,
    videoDisabled,
    videoDisabledReason,
    videoLabel,
    hasVideoClip,
    videoBusy,
    durableVideo,
  } = state;

  return (
    <div
      className="studio-asset-panel__section"
      data-testid="studio-scene-asset-type"
    >
      <div className="studio-asset-panel__row-label">
        <p className="studio-asset-panel__section-label">Asset Type</p>
        <p className="studio-asset-panel__helper studio-asset-panel__helper--inline">
          Source format for this scene
        </p>
      </div>
      <div
        className="studio-asset-type"
        role="group"
        aria-label="Asset type"
      >
        <button
          type="button"
          className="studio-asset-type__btn"
          data-active={sceneEdits.assetType === "image" ? "true" : "false"}
          aria-pressed={sceneEdits.assetType === "image"}
          disabled={fieldsReadOnly}
          onClick={() => onSceneAssetTypeChange("image")}
          data-testid="studio-scene-asset-image"
        >
          Image
        </button>
        <button
          type="button"
          className="studio-asset-type__btn"
          data-active={sceneEdits.assetType === "video" ? "true" : "false"}
          aria-pressed={sceneEdits.assetType === "video"}
          disabled={fieldsReadOnly}
          onClick={() => onSceneAssetTypeChange("video")}
          data-testid="studio-scene-asset-video"
        >
          Video
        </button>
      </div>

      {showMotionPrompt ? (
        <>
          <div
            className="studio-asset-motion"
            data-testid="studio-motion-prompt"
          >
            <div className="studio-asset-panel__row-label">
              <p className="studio-asset-panel__section-label">
                Motion Prompt
              </p>
              <p className="studio-asset-panel__helper studio-asset-panel__helper--inline">
                {motionPrompt.length}/{SCENE_MOTION_PROMPT_MAX_CHARS}
              </p>
            </div>
            <textarea
              className="studio-prompt-card__field"
              value={motionPrompt}
              maxLength={SCENE_MOTION_PROMPT_MAX_CHARS}
              readOnly={fieldsReadOnly}
              disabled={fieldsReadOnly}
              placeholder="Describe what the subject does during this video…"
              rows={5}
              aria-label="Motion Prompt"
              data-testid="studio-motion-prompt-field"
              onChange={(e) => onSceneMotionPromptChange(e.target.value)}
            />
            <p className="studio-asset-panel__helper">
              Describe movement and action only. The Visual Prompt controls
              the subject, room, lighting, and composition.
            </p>
          </div>

          <div
            className="studio-asset-inline studio-asset-inline--veo"
            data-testid="studio-source-video-block"
          >
            <span className="studio-asset-inline__label">
              <Video className="h-3 w-3" aria-hidden />
              Generate Video
            </span>
            {videoStale ? (
              <StatusBadge tone="warning" testId="studio-video-stale-badge">
                Outdated
              </StatusBadge>
            ) : videoSucceeded ? (
              <StatusBadge tone="success" testId="studio-video-ready-badge">
                Ready
              </StatusBadge>
            ) : null}
            <button
              type="button"
              className="studio-asset-btn studio-asset-btn--compact"
              disabled={videoDisabled}
              title={videoDisabledReason ?? undefined}
              data-testid="studio-generate-video"
              onClick={() => {
                void onGenerateSceneVideo?.();
              }}
            >
              {videoLabel}
            </button>
            {hasVideoClip && onClearSceneVideo ? (
              <button
                type="button"
                className="studio-asset-btn studio-asset-btn--ghost studio-asset-btn--compact"
                disabled={videoBusy}
                title="Remove the current scene video from the package"
                data-testid="studio-clear-video"
                onClick={() => {
                  void onClearSceneVideo();
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
          {durableVideo?.status === "stubbed" ? (
            <p
              className="studio-asset-panel__hint"
              data-testid="studio-video-stub-hint"
            >
              Video stubbed — set MM_VIDEO_RENDER=live and MM_VIDEO_PROVIDER=veo
            </p>
          ) : null}
        </>
      ) : null}

      <div
        className="studio-asset-inline"
        data-testid="studio-scene-image-card"
      >
        <StatusBadge tone={imageStatus.tone}>{imageStatus.label}</StatusBadge>
        <button
          type="button"
          className="studio-asset-btn studio-asset-btn--compact"
          disabled={actionDisabled}
          title={actionDisabledReason ?? actionLabel}
          onClick={() => {
            void onValidateImageRender?.();
          }}
          data-testid="studio-generate-image-shell"
        >
          {actionLabel}
        </button>
      </div>

      {dirty ? (
        <p
          className="studio-asset-panel__hint"
          data-testid="studio-render-save-hint"
        >
          Save this scene before generating its image.
        </p>
      ) : null}
      {imageBusy && !fullBusy ? (
        <p
          className="studio-asset-panel__hint"
          data-testid="studio-render-loading"
        >
          Generating image…
        </p>
      ) : null}
      {renderError ? (
        <p
          className="studio-asset-panel__error studio-asset-panel__error--clamp"
          data-testid="studio-render-error"
          title={renderError}
        >
          {renderError}
        </p>
      ) : null}
      {renderMessage || durableDryRunOk ? (
        <p
          className="studio-asset-panel__hint"
          data-testid="studio-render-success"
        >
          {renderMessage ??
            (liveSucceeded
              ? "Image generated"
              : "Renderer path verified — no image generated")}
        </p>
      ) : null}
      {!renderError && durableFailed && durableRender?.error ? (
        <p
          className="studio-asset-panel__error studio-asset-panel__error--clamp"
          data-testid="studio-render-durable-error"
          title={durableRender.error.message}
        >
          {durableRender.error.message}
        </p>
      ) : null}
    </div>
  );
}
