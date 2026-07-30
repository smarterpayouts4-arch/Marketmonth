"use client";

import { useState, type ReactNode } from "react";
import { Copy, FileText, ImageIcon, Mic } from "lucide-react";

import type { ContentFormatPackage } from "@/brain/content-studio";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PromptRailProps = {
  pkg: ContentFormatPackage | null;
  imagePrompt: string;
  voiceoverPrompt: string;
  script: string;
  onImagePromptChange: (v: string) => void;
  onVoiceoverPromptChange: (v: string) => void;
  onScriptChange: (v: string) => void;
  dirty: boolean;
  saveLabel: string;
  onSave: () => void;
  onReset: () => void;
  onCopyExternalPrompt?: () => void;
  promptCopied?: boolean;
};

function PromptCard({
  title,
  icon,
  value,
  onChange,
  maxHint,
  grow,
}: {
  title: string;
  icon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  maxHint?: number;
  grow?: "script" | "default";
}) {
  return (
    <div
      className={cn(
        "studio-prompt-card",
        grow === "script" && "studio-prompt-card--script"
      )}
    >
      <div className="studio-prompt-card__head">
        <span className="studio-prompt-card__icon">{icon}</span>
        <p className="studio-prompt-card__title">{title}</p>
        <p className="studio-prompt-card__meta">
          {value.length}
          {maxHint != null ? ` / ${maxHint}` : ""}
        </p>
      </div>
      <textarea
        className="studio-prompt-card__field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function PrefToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-foreground">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-card shadow transition",
            checked && "translate-x-4"
          )}
        />
      </button>
    </label>
  );
}

export function StudioPromptRail({
  pkg,
  imagePrompt,
  voiceoverPrompt,
  script,
  onImagePromptChange,
  onVoiceoverPromptChange,
  onScriptChange,
  dirty,
  saveLabel,
  onSave,
  onReset,
  onCopyExternalPrompt,
  promptCopied,
}: PromptRailProps) {
  const [captions, setCaptions] = useState(true);
  const [bgm, setBgm] = useState(true);
  const [watermark, setWatermark] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);

  if (!pkg) {
    return (
      <aside
        className="studio-prompt-rail text-xs text-text-secondary"
        data-testid="studio-prompt-rail-empty"
      >
        Generating format package…
      </aside>
    );
  }

  return (
    <aside className="studio-prompt-rail" data-testid="studio-prompt-rail">
      {pkg.status === "research_required" ? (
        <div
          className="studio-prompt-card studio-prompt-card--notice"
          role="status"
          data-testid="studio-research-required"
        >
          <p className="font-semibold">Research required</p>
          <p className="mt-0.5 text-text-secondary">
            Draft only — export stays unavailable.
          </p>
          {pkg.unresolvedResearch.length > 0 ? (
            <ul className="mt-1 list-disc space-y-0.5 pl-3.5">
              {pkg.unresolvedResearch.slice(0, 4).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {onCopyExternalPrompt ? (
        <Button
          type="button"
          variant="outline"
          className="studio-prompt-rail__copy h-8 justify-start rounded-xl px-2.5 text-xs"
          onClick={onCopyExternalPrompt}
          data-testid="studio-rail-copy-chatgpt"
        >
          <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {promptCopied
            ? "Prompt copied — paste into ChatGPT"
            : "Use in ChatGPT (copy prompt)"}
        </Button>
      ) : null}

      <PromptCard
        title="Visual metaphor"
        icon={<ImageIcon className="h-3 w-3" aria-hidden />}
        value={imagePrompt}
        onChange={onImagePromptChange}
        maxHint={800}
      />
      <PromptCard
        title="VO / voiceover"
        icon={<Mic className="h-3 w-3" aria-hidden />}
        value={voiceoverPrompt}
        onChange={onVoiceoverPromptChange}
        maxHint={2000}
      />
      <PromptCard
        title="Content / script"
        icon={<FileText className="h-3 w-3" aria-hidden />}
        value={script}
        onChange={onScriptChange}
        maxHint={4000}
        grow="script"
      />

      <div className="studio-prompt-card studio-prompt-card--compact">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setFormatOpen((v) => !v)}
          aria-expanded={formatOpen}
        >
          <p className="studio-prompt-card__title">
            Format · {pkg.aspectRatio} · ~{Math.round(pkg.durationSeconds)}s
          </p>
          <span className="studio-prompt-card__meta">
            {formatOpen ? "Hide" : "Prefs"}
          </span>
        </button>
        {formatOpen ? (
          <div className="mt-1.5 space-y-1.5 border-t border-border/50 pt-1.5">
            <PrefToggle
              label="Auto captions"
              checked={captions}
              onChange={setCaptions}
            />
            <PrefToggle
              label="Background music"
              checked={bgm}
              onChange={setBgm}
            />
            <PrefToggle
              label="Brand watermark"
              checked={watermark}
              onChange={setWatermark}
            />
          </div>
        ) : null}
      </div>

      <div className="studio-prompt-card studio-prompt-card--actions">
        <button
          type="button"
          className="h-8 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
          disabled={!dirty}
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
          Reset
        </button>
      </div>
    </aside>
  );
}
