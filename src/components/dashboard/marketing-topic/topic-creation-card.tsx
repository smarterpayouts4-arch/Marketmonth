"use client";

import { Sparkles } from "lucide-react";

import type { MarketingFocus } from "@/brain/content/marketing-focus";

import {
  AUTO_GENERATE_BUTTON_LABEL,
  GENERATE_BUTTON_LABEL,
  REGENERATE_IDEAS_BUTTON_LABEL,
  START_OVER_BUTTON_LABEL,
  TOPIC_CARD_LABEL,
  TOPIC_INPUT_PLACEHOLDER,
} from "./copy";
import type { ExtraContextUiState } from "./extra-context-client";
import { MarketingFocusSelector } from "./marketing-focus-selector";
import { SupplementalContext } from "./supplemental-context";

type TopicCreationCardProps = {
  topic: string;
  onTopicChange: (value: string) => void;
  /** Manual: requires a typed topic. */
  onGenerate: () => void;
  /** Automatic: invents a topic from brand context. */
  onAutoGenerate: () => void;
  onStartOver?: () => void;
  onRegenerateIdeas?: () => void;
  showStartOver?: boolean;
  showRegenerate?: boolean;
  loading: boolean;
  generateDisabled?: boolean;
  compact?: boolean;
  marketingFocus: MarketingFocus | null;
  onMarketingFocusChange: (value: MarketingFocus | null) => void;
  /** Inline chip-area error (Idea Lab objective gate). */
  focusError?: string | null;
  contextExpanded: boolean;
  onContextExpandedChange: (open: boolean) => void;
  contextState: ExtraContextUiState;
  onContextChange: (next: ExtraContextUiState) => void;
};

export function TopicCreationCard({
  topic,
  onTopicChange,
  onGenerate,
  onAutoGenerate,
  onStartOver,
  onRegenerateIdeas,
  showStartOver = false,
  showRegenerate = false,
  loading,
  generateDisabled,
  compact = false,
  marketingFocus,
  onMarketingFocusChange,
  focusError = null,
  contextExpanded,
  onContextExpandedChange,
  contextState,
  onContextChange,
}: TopicCreationCardProps) {
  const disabled = loading || generateDisabled;
  const hasTopic = Boolean(topic.trim());

  return (
    <section
      className={
        compact
          ? "h-full rounded-xl border border-border bg-card p-2.5 shadow-soft"
          : "h-full rounded-2xl border border-border bg-card p-3.5 shadow-soft sm:p-4"
      }
    >
      {!compact ? (
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-foreground uppercase">
          {TOPIC_CARD_LABEL}
        </h2>
      ) : (
        <h2 className="sr-only">{TOPIC_CARD_LABEL}</h2>
      )}
      <label htmlFor="master-topic-input" className="sr-only">
        Marketing topic
      </label>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          id="master-topic-input"
          type="text"
          value={topic}
          disabled={loading}
          onChange={(e) => onTopicChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hasTopic && !disabled) {
              e.preventDefault();
              onGenerate();
            }
          }}
          placeholder={TOPIC_INPUT_PLACEHOLDER}
          className="min-h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none ring-primary/30 placeholder:text-text-muted focus:ring-2 disabled:opacity-60"
        />
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <button
            type="button"
            disabled={disabled || !hasTopic}
            onClick={onGenerate}
            title={
              hasTopic
                ? "Generate directions from your topic"
                : "Enter a topic first, or use Auto-generate"
            }
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {GENERATE_BUTTON_LABEL}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onAutoGenerate}
            title="Invent a topic from your brand context"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold text-foreground transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            {AUTO_GENERATE_BUTTON_LABEL}
          </button>
          {showRegenerate && onRegenerateIdeas ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onRegenerateIdeas}
              title="Keep this master topic and create a new set of ideas"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-background px-3.5 text-sm font-semibold text-foreground transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {REGENERATE_IDEAS_BUTTON_LABEL}
            </button>
          ) : null}
          {showStartOver && onStartOver ? (
            <button
              type="button"
              disabled={loading}
              onClick={onStartOver}
              title="Clear this workspace only — company data and history stay"
              className="inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-sm font-medium text-text-secondary underline-offset-2 hover:underline disabled:opacity-50"
            >
              {START_OVER_BUTTON_LABEL}
            </button>
          ) : null}
        </div>
      </div>

      <div className={compact ? "mt-2" : "mt-3"}>
        <MarketingFocusSelector
          value={marketingFocus}
          onChange={onMarketingFocusChange}
          disabled={loading}
          compact={compact}
          error={focusError}
        />
      </div>

      <SupplementalContext
        expanded={contextExpanded}
        onExpandedChange={onContextExpandedChange}
        state={contextState}
        onChange={onContextChange}
        disabled={loading}
        compact={compact}
      />
    </section>
  );
}
