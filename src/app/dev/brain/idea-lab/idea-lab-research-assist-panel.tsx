"use client";

/**
 * Thin Research Assist v1 — one panel: copy prompt → paste JSON → validate & use.
 * Run-scoped only; does not rewrite CSV or write topic history.
 */
type IdeaLabResearchAssistPanelProps = {
  open: boolean;
  prompt: string | null;
  paste: string;
  status: "idle" | "ready" | "error";
  message: string | null;
  findingCount: number;
  loadingPrompt: boolean;
  disabled?: boolean;
  onPasteChange: (value: string) => void;
  onCopyPrompt: () => void;
  onBuildPrompt: () => void;
  onValidateAndUse: () => void;
  onClear: () => void;
};

export function IdeaLabResearchAssistPanel({
  open,
  prompt,
  paste,
  status,
  message,
  findingCount,
  loadingPrompt,
  disabled,
  onPasteChange,
  onCopyPrompt,
  onBuildPrompt,
  onValidateAndUse,
  onClear,
}: IdeaLabResearchAssistPanelProps) {
  if (!open) return null;

  return (
    <div
      className="mt-3 rounded-xl border border-border bg-background/80 px-3.5 py-3.5 sm:px-4"
      data-testid="idea-lab-research-assist"
    >
      <h3 className="text-sm font-semibold text-foreground">
        Research your company
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-text-muted">
        Copy a personalized prompt into ChatGPT or Gemini, paste the JSON result
        here, then validate. Findings apply only to the next Auto-generate run.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || loadingPrompt}
          onClick={() => {
            if (!prompt) {
              onBuildPrompt();
              return;
            }
            onCopyPrompt();
          }}
          className="inline-flex min-h-9 items-center rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          data-testid="research-assist-copy-prompt"
        >
          {loadingPrompt
            ? "Building…"
            : prompt
              ? "Copy prompt"
              : "Build prompt"}
        </button>
        {prompt ? (
          <button
            type="button"
            disabled={disabled || loadingPrompt}
            onClick={onBuildPrompt}
            className="inline-flex min-h-9 items-center rounded-xl px-2 text-xs font-medium text-text-secondary underline-offset-2 hover:underline disabled:opacity-50"
            data-testid="research-assist-rebuild-prompt"
          >
            Rebuild
          </button>
        ) : null}
        {findingCount > 0 || paste.trim() ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onClear}
            className="inline-flex min-h-9 items-center rounded-xl px-2 text-xs font-medium text-text-secondary underline-offset-2 hover:underline disabled:opacity-50"
            data-testid="research-assist-clear"
          >
            Clear
          </button>
        ) : null}
      </div>

      {prompt ? (
        <pre
          className="mt-2 max-h-28 overflow-auto rounded-lg border border-border bg-muted/40 p-2 text-[10px] leading-snug text-text-muted"
          data-testid="research-assist-prompt-preview"
        >
          {prompt.slice(0, 480)}
          {prompt.length > 480 ? "…" : ""}
        </pre>
      ) : null}

      <label className="mt-3 block text-xs font-medium text-foreground">
        Paste JSON
        <textarea
          value={paste}
          onChange={(e) => onPasteChange(e.target.value)}
          disabled={disabled}
          rows={5}
          placeholder='{"schemaVersion":"company-research-import-v1",...}'
          className="mt-1 w-full resize-y rounded-lg border border-border bg-card px-2.5 py-2 font-mono text-[11px] text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
          data-testid="research-assist-paste"
        />
      </label>

      <button
        type="button"
        disabled={disabled || !paste.trim()}
        onClick={onValidateAndUse}
        className="mt-2 inline-flex min-h-9 items-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        data-testid="research-assist-validate"
      >
        Validate and use
      </button>

      {message ? (
        <p
          className={
            status === "error"
              ? "mt-2 text-xs text-red-700"
              : "mt-2 text-xs text-text-secondary"
          }
          role={status === "error" ? "alert" : undefined}
          data-testid="research-assist-status"
        >
          {message}
        </p>
      ) : null}

      {findingCount > 0 && status === "ready" ? (
        <p
          className="mt-1 text-xs text-text-muted"
          data-testid="research-assist-ready-count"
        >
          {findingCount} finding{findingCount === 1 ? "" : "s"} ready for the
          next Auto-generate.
        </p>
      ) : null}
    </div>
  );
}
