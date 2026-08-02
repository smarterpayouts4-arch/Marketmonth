"use client";

import { Mic } from "lucide-react";

import type { AssetActionState } from "./asset-action-state";
import { StatusBadge } from "./status-badge";

export type VoiceCardProps = {
  state: AssetActionState;
  onGenerateSceneVoice?: () => void | Promise<boolean>;
  onClearSceneVoice?: () => void | Promise<boolean>;
};

export function VoiceCard({
  state,
  onGenerateSceneVoice,
  onClearSceneVoice,
}: VoiceCardProps) {
  const {
    hasVoiceAudio,
    durableVoice,
    voiceStatus,
    voiceDisabled,
    voiceDisabledReason,
    voiceLabel,
    voiceBusy,
    voiceFailed,
    voiceErrorMessage,
  } = state;

  return (
    <div className="studio-asset-card" data-testid="studio-voiceover-card">
      <div className="studio-asset-card__head">
        <span className="studio-asset-card__icon" aria-hidden>
          <Mic className="h-3 w-3" />
        </span>
        <h3 className="studio-asset-card__title">Voiceover</h3>
        <StatusBadge
          tone={voiceStatus.tone}
          testId={
            hasVoiceAudio &&
            durableVoice?.durationSeconds != null &&
            durableVoice.durationSeconds > 0
              ? "studio-voice-duration"
              : hasVoiceAudio && durableVoice?.durationSeconds == null
                ? "studio-voice-duration-unverified"
                : undefined
          }
        >
          {voiceStatus.label}
        </StatusBadge>
      </div>

      {hasVoiceAudio && durableVoice?.assetUrl ? (
        <audio
          controls
          preload="metadata"
          src={durableVoice.assetUrl}
          className="studio-asset-audio__player"
          data-testid="studio-voice-audio"
        />
      ) : null}

      <div className="studio-asset-card__actions studio-asset-card__actions--row">
        <button
          type="button"
          className="studio-asset-btn studio-asset-btn--compact"
          disabled={voiceDisabled}
          title={voiceDisabledReason ?? undefined}
          data-testid="studio-generate-voice"
          onClick={() => {
            void onGenerateSceneVoice?.();
          }}
        >
          {voiceLabel}
        </button>
        {hasVoiceAudio && onClearSceneVoice ? (
          <button
            type="button"
            className="studio-asset-btn studio-asset-btn--ghost studio-asset-btn--compact"
            disabled={voiceBusy}
            title="Remove the current scene voice from the package"
            data-testid="studio-clear-voice"
            onClick={() => {
              void onClearSceneVoice();
            }}
          >
            Clear
          </button>
        ) : null}
      </div>

      {durableVoice?.status === "stubbed" ? (
        <p
          className="studio-asset-panel__hint"
          data-testid="studio-voice-stub-hint"
        >
          Voice stubbed — set MM_VOICE_RENDER=live for TTS
        </p>
      ) : null}
      {voiceFailed && voiceErrorMessage ? (
        <p
          className="studio-asset-panel__error studio-asset-panel__error--clamp"
          data-testid="studio-voice-error"
          title={voiceErrorMessage}
        >
          {voiceErrorMessage}
        </p>
      ) : null}
    </div>
  );
}
