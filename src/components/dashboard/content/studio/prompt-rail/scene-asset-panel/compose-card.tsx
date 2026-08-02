"use client";

import { Clapperboard } from "lucide-react";

import type { FullGenerateProgress } from "../../../hooks/use-atom-content-studio/use-studio-edit-actions";
import type { AssetActionState } from "./asset-action-state";
import { FullGenerateStepper } from "./full-generate-stepper";
import { StatusBadge } from "./status-badge";

export type ComposeCardProps = {
  state: AssetActionState;
  fullGenerateProgress: FullGenerateProgress | null;
  onComposeSceneMp4?: () => void | Promise<boolean>;
  onGenerateCompleteScene?: () => void | Promise<boolean>;
};

export function ComposeCard({
  state,
  fullGenerateProgress,
  onComposeSceneMp4,
  onGenerateCompleteScene,
}: ComposeCardProps) {
  const {
    composeStatus,
    completeDisabled,
    completeDisabledReason,
    showFullGenerateStepper,
    stepperIds,
    composeDisabled,
    composeDisabledReason,
    composeLabel,
    hasComposedMp4,
    durableComposed,
  } = state;

  return (
    <div
      className="studio-asset-card studio-asset-card--final"
      data-testid="studio-final-scene-video-card"
    >
      <div className="studio-asset-card__head">
        <span className="studio-asset-card__icon" aria-hidden>
          <Clapperboard className="h-3 w-3" />
        </span>
        <h3 className="studio-asset-card__title">Final Scene Video</h3>
        <StatusBadge
          tone={composeStatus.tone}
          testId={
            composeStatus.label === "Not created"
              ? "studio-compose-status-empty"
              : undefined
          }
        >
          {composeStatus.label}
        </StatusBadge>
      </div>

      <button
        type="button"
        className="studio-asset-btn studio-asset-btn--primary"
        disabled={completeDisabled}
        title={completeDisabledReason ?? undefined}
        data-testid="studio-generate-complete-scene"
        onClick={() => {
          void onGenerateCompleteScene?.();
        }}
      >
        {fullGenerateProgress?.active
          ? "Generating complete scene…"
          : "Generate Complete Scene"}
      </button>

      {showFullGenerateStepper && fullGenerateProgress ? (
        <FullGenerateStepper
          progress={fullGenerateProgress}
          stepperIds={stepperIds}
        />
      ) : null}

      <div className="studio-asset-card__actions studio-asset-card__actions--row">
        <button
          type="button"
          className="studio-asset-btn studio-asset-btn--compact"
          disabled={composeDisabled}
          title={composeDisabledReason ?? undefined}
          data-testid="studio-compose-scene-mp4"
          onClick={() => {
            void onComposeSceneMp4?.();
          }}
        >
          {composeLabel}
        </button>
      </div>

      {hasComposedMp4 && durableComposed?.assetUrl ? (
        <a
          href={durableComposed.assetUrl}
          target="_blank"
          rel="noreferrer"
          className="studio-asset-panel__link"
          data-testid="studio-compose-open"
        >
          Open / download scene MP4
        </a>
      ) : null}

      {durableComposed?.status === "stubbed" ? (
        <p
          className="studio-asset-panel__hint"
          data-testid="studio-compose-stub-hint"
        >
          Scene MP4 stubbed — set MM_SCENE_COMPOSE_RENDER=live and
          MM_SCENE_COMPOSITOR=ffmpeg
        </p>
      ) : null}
      {hasComposedMp4 &&
      durableComposed?.durationSeconds != null &&
      durableComposed.durationSeconds > 0 ? (
        <p
          className="studio-asset-panel__hint"
          data-testid="studio-compose-duration"
        >
          MP4 duration {durableComposed.durationSeconds.toFixed(2)}s
        </p>
      ) : null}
      {hasComposedMp4 && durableComposed?.durationSeconds == null ? (
        <p
          className="studio-asset-panel__hint"
          data-testid="studio-compose-duration-unverified"
        >
          Duration Unverified
        </p>
      ) : null}
      {durableComposed?.status === "failed" && durableComposed.error ? (
        <p
          className="studio-asset-panel__error studio-asset-panel__error--clamp"
          data-testid="studio-compose-error"
          title={durableComposed.error.message}
        >
          {durableComposed.error.message}
        </p>
      ) : null}
    </div>
  );
}
