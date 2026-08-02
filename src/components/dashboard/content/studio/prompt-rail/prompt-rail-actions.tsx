"use client";

type PromptRailActionsProps = {
  dirty: boolean;
  fieldsReadOnly: boolean;
  /** Manual Short workspace uses "Save Scene" as the stable primary label. */
  isManualWorkspace?: boolean;
  /** When true, renders as the Asset panel footer (no outer card chrome). */
  embedded?: boolean;
  saveLabel: string;
  onSave: () => void | Promise<void>;
  onReset: () => void | Promise<void>;
};

function resolveStatusAndSaveButton(input: {
  dirty: boolean;
  fieldsReadOnly: boolean;
  isManualWorkspace: boolean;
  saveLabel: string;
}): { statusText: string; saveButtonLabel: string; saveBusy: boolean } {
  const idleSave = input.isManualWorkspace ? "Save Scene" : "Save draft";
  const label = input.saveLabel.trim();
  const lower = label.toLowerCase();

  if (lower.includes("saving") || lower === "saving…") {
    return {
      statusText: label,
      saveButtonLabel: "Saving…",
      saveBusy: true,
    };
  }
  if (lower.includes("resetting")) {
    return {
      statusText: label,
      saveButtonLabel: idleSave,
      saveBusy: false,
    };
  }
  if (
    lower.includes("failed") ||
    lower.includes("error") ||
    lower.startsWith("switch to") ||
    lower.includes("not persisted")
  ) {
    return {
      statusText: label,
      saveButtonLabel: idleSave,
      saveBusy: false,
    };
  }
  if (lower === "saved") {
    return {
      statusText: "Saved",
      saveButtonLabel: idleSave,
      saveBusy: false,
    };
  }
  if (input.dirty && !input.fieldsReadOnly) {
    return {
      statusText: "Unsaved changes",
      saveButtonLabel: idleSave,
      saveBusy: false,
    };
  }
  return {
    statusText: "All changes saved",
    saveButtonLabel: idleSave,
    saveBusy: false,
  };
}

export function PromptRailActions({
  dirty,
  fieldsReadOnly,
  isManualWorkspace = false,
  embedded = false,
  saveLabel,
  onSave,
  onReset,
}: PromptRailActionsProps) {
  const { statusText, saveButtonLabel, saveBusy } = resolveStatusAndSaveButton({
    dirty,
    fieldsReadOnly,
    isManualWorkspace,
    saveLabel,
  });

  const showUnsavedDot =
    dirty && !fieldsReadOnly && statusText === "Unsaved changes";
  const showSavedDot =
    !dirty &&
    !fieldsReadOnly &&
    (statusText === "All changes saved" || statusText === "Saved");

  return (
    <div
      className={
        embedded
          ? "studio-prompt-actions studio-prompt-actions--embedded"
          : "studio-prompt-card studio-prompt-card--actions"
      }
      data-testid="studio-prompt-actions"
    >
      <div className="studio-prompt-actions__row">
        <p
          className="studio-prompt-actions__status"
          data-testid="studio-save-status"
          data-dirty={dirty ? "true" : "false"}
        >
          {showUnsavedDot ? (
            <span
              className="studio-prompt-actions__dot studio-prompt-actions__dot--warn"
              aria-hidden
            />
          ) : null}
          {showSavedDot ? (
            <span
              className="studio-prompt-actions__dot studio-prompt-actions__dot--ok"
              aria-hidden
            />
          ) : null}
          {statusText}
        </p>
        <div className="studio-prompt-actions__buttons">
          <button
            type="button"
            className={
              embedded
                ? "studio-prompt-actions__btn studio-prompt-actions__btn--primary"
                : "h-8 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
            }
            disabled={!dirty || fieldsReadOnly || saveBusy}
            onClick={onSave}
            data-testid="studio-save-format"
          >
            {saveButtonLabel}
          </button>
          <button
            type="button"
            className={
              embedded
                ? "studio-prompt-actions__btn studio-prompt-actions__btn--ghost"
                : "h-8 rounded-lg border border-border bg-card px-3 text-xs text-text-secondary"
            }
            onClick={onReset}
            title="Clears prompt edits back to the generated baseline. Does not restore deleted scenes, change scene count, or clear voice/image assets."
            data-testid="studio-reset-format"
          >
            Reset to generated
          </button>
        </div>
      </div>
    </div>
  );
}
