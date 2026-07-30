"use client";

import type { StudioPromptMode } from "../../hooks/use-atom-content-studio";

type PromptModeToggleProps = {
  mode: StudioPromptMode;
  onPromptModeChange: (mode: StudioPromptMode) => void;
};

export function PromptModeToggle({
  mode,
  onPromptModeChange,
}: PromptModeToggleProps) {
  return (
    <div
      className="studio-prompt-mode"
      role="group"
      aria-label="Prompt source"
      data-testid="studio-prompt-mode"
      data-mode={mode}
    >
      <button
        type="button"
        className="studio-prompt-mode__btn"
        data-active={mode === "generated" ? "true" : "false"}
        aria-pressed={mode === "generated"}
        onClick={() => onPromptModeChange("generated")}
        data-testid="studio-prompt-mode-generated"
      >
        Generated
      </button>
      <button
        type="button"
        className="studio-prompt-mode__btn"
        data-active={mode === "manual" ? "true" : "false"}
        aria-pressed={mode === "manual"}
        onClick={() => onPromptModeChange("manual")}
        data-testid="studio-prompt-mode-manual"
      >
        Manual
      </button>
    </div>
  );
}
