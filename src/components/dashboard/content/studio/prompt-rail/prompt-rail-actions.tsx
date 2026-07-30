"use client";

type PromptRailActionsProps = {
  dirty: boolean;
  fieldsReadOnly: boolean;
  saveLabel: string;
  onSave: () => void | Promise<void>;
  onReset: () => void | Promise<void>;
};

export function PromptRailActions({
  dirty,
  fieldsReadOnly,
  saveLabel,
  onSave,
  onReset,
}: PromptRailActionsProps) {
  return (
    <div className="studio-prompt-card studio-prompt-card--actions">
      <button
        type="button"
        className="h-8 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
        disabled={!dirty || fieldsReadOnly}
        onClick={onSave}
        data-testid="studio-save-format"
      >
        {saveLabel}
      </button>
      <button
        type="button"
        className="h-8 rounded-lg border border-border bg-card px-3 text-xs text-text-secondary"
        onClick={onReset}
        data-testid="studio-reset-format"
      >
        Reset all
      </button>
    </div>
  );
}
