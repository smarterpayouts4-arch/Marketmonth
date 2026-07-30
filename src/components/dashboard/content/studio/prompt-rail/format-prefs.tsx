"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

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

type FormatPrefsProps = {
  aspectRatio: string;
  durationSeconds: number;
};

export function FormatPrefs({
  aspectRatio,
  durationSeconds,
}: FormatPrefsProps) {
  const [captions, setCaptions] = useState(true);
  const [bgm, setBgm] = useState(true);
  const [watermark, setWatermark] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);

  return (
    <div className="studio-prompt-card studio-prompt-card--compact">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setFormatOpen((v) => !v)}
        aria-expanded={formatOpen}
      >
        <p className="studio-prompt-card__title">
          Format · {aspectRatio} · ~{Math.round(durationSeconds)}s
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
  );
}
