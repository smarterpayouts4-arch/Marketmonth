"use client";

import { useRef, useState } from "react";
import { Paperclip, Plus, X } from "lucide-react";

import {
  CONTEXT_EXAMPLES,
  CONTEXT_HELP_MICROCOPY,
  CONTEXT_HELPFUL_LINE,
  CONTEXT_PANEL_INTRO,
  CONTEXT_PANEL_TITLE,
  CONTEXT_TRIGGER_LABEL,
} from "./copy";
import {
  EXTRA_CONTEXT_MAX_CHARS,
  combinedContextLength,
  emptyExtraContextUi,
  readDroppedFiles,
  type ExtraContextUiState,
} from "./extra-context-client";

type SupplementalContextProps = {
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  state: ExtraContextUiState;
  onChange: (next: ExtraContextUiState) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function SupplementalContext({
  expanded,
  onExpandedChange,
  state,
  onChange,
  disabled,
  compact = false,
}: SupplementalContextProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const total = combinedContextLength(state);
  const overLimit = total > EXTRA_CONTEXT_MAX_CHARS;
  const hasContent = Boolean(state.pastedText.trim() || state.files.length);

  async function handleFiles(list: FileList | null) {
    if (!list || disabled) return;
    const { files, error } = await readDroppedFiles(list, state.files);
    onChange({ ...state, files, error });
  }

  return (
    <div className={compact ? "mt-2.5 border-t border-border pt-2" : "mt-3 border-t border-border pt-3"}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={expanded}
        onClick={() => onExpandedChange(!expanded)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:text-primary-hover disabled:opacity-50"
      >
        <Plus
          className={[
            "size-4 transition-transform",
            expanded ? "rotate-45" : "",
          ].join(" ")}
          aria-hidden
        />
        {CONTEXT_TRIGGER_LABEL}
      </button>
      {!expanded && !compact ? (
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-text-muted">
          {CONTEXT_HELP_MICROCOPY}
        </p>
      ) : null}

      {expanded ? (
        <div
          className={[
            "mt-3 rounded-xl border bg-background/80 px-3.5 py-3.5 transition sm:px-4",
            dragging ? "border-primary bg-primary/5" : "border-border",
          ].join(" ")}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFiles(e.dataTransfer.files);
          }}
        >
          <p className="text-[11px] font-semibold tracking-[0.12em] text-text-muted uppercase">
            {CONTEXT_PANEL_TITLE}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {CONTEXT_PANEL_INTRO} {CONTEXT_HELP_MICROCOPY}
          </p>
          <p className="mt-2 text-xs text-text-muted">{CONTEXT_HELPFUL_LINE}</p>

          <ul className="mt-2 grid gap-1 text-xs text-text-muted sm:grid-cols-2">
            {CONTEXT_EXAMPLES.map((example) => (
              <li key={example}>• {example}</li>
            ))}
          </ul>

          <label htmlFor="marketing-topic-extra-paste" className="sr-only">
            Paste notes or additional instructions
          </label>
          <textarea
            id="marketing-topic-extra-paste"
            value={state.pastedText}
            disabled={disabled}
            rows={3}
            onChange={(e) =>
              onChange({ ...state, pastedText: e.target.value, error: null })
            }
            placeholder="Paste notes or additional instructions here…"
            className="mt-3 w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2 disabled:opacity-60"
          />

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition hover:border-primary/40 disabled:opacity-50"
              onClick={() => inputRef.current?.click()}
            >
              <Paperclip className="size-3.5 text-primary" aria-hidden />
              Attach .txt or .md file
            </button>
            <span className="text-xs text-text-muted">
              {state.files.length === 0
                ? "No files attached"
                : `${state.files.length} file${state.files.length === 1 ? "" : "s"} attached`}
            </span>
            <span
              className={[
                "ml-auto text-xs tabular-nums",
                overLimit ? "font-medium text-red-700" : "text-text-muted",
              ].join(" ")}
              aria-live="polite"
            >
              {total.toLocaleString()} / {EXTRA_CONTEXT_MAX_CHARS.toLocaleString()}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              multiple
              className="sr-only"
              disabled={disabled}
              aria-label="Attach .txt or .md files"
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {state.files.length > 0 ? (
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {state.files.map((file) => (
                <li
                  key={file.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground"
                >
                  <span className="max-w-[140px] truncate">{file.name}</span>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Remove ${file.name}`}
                    className="rounded-full p-0.5 text-text-muted hover:bg-muted hover:text-foreground"
                    onClick={() =>
                      onChange({
                        ...state,
                        files: state.files.filter((f) => f.id !== file.id),
                        error: null,
                      })
                    }
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {hasContent ? (
            <button
              type="button"
              disabled={disabled}
              className="mt-2 text-xs font-medium text-text-muted underline-offset-2 hover:underline"
              onClick={() => onChange(emptyExtraContextUi())}
            >
              Clear all context
            </button>
          ) : null}

          {state.error ? (
            <p className="mt-2 text-sm text-red-700" role="alert">
              {state.error}
            </p>
          ) : null}
          {overLimit ? (
            <p className="mt-2 text-sm text-red-700" role="alert">
              Combined context exceeds{" "}
              {EXTRA_CONTEXT_MAX_CHARS.toLocaleString()} characters. Remove
              content before generating — nothing is truncated automatically.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
