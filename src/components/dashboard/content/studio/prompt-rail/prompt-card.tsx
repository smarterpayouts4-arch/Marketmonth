"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

export function PromptCard({
  title,
  icon,
  value,
  onChange,
  maxHint,
  grow,
  copyTestId,
  readOnly,
  compact,
}: {
  title: string;
  icon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  maxHint?: number;
  grow?: "script" | "default";
  copyTestId: string;
  readOnly?: boolean;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  async function copyField() {
    const text = value.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={cn(
        "studio-prompt-card",
        grow === "script" && "studio-prompt-card--script",
        compact && "studio-prompt-card--compact"
      )}
    >
      <div className="studio-prompt-card__head">
        <span className="studio-prompt-card__icon">{icon}</span>
        <p className="studio-prompt-card__title">{title}</p>
        <p className="studio-prompt-card__meta">
          {value.length}
          {maxHint != null ? ` / ${maxHint}` : ""}
        </p>
        <button
          type="button"
          className="studio-prompt-card__copy"
          onClick={() => {
            void copyField();
          }}
          disabled={!value.trim()}
          aria-label={copied ? `${title} copied` : `Copy ${title}`}
          title={copied ? "Copied" : "Copy"}
          data-testid={copyTestId}
        >
          {copied ? (
            <Check className="h-3 w-3" aria-hidden />
          ) : (
            <Copy className="h-3 w-3" aria-hidden />
          )}
        </button>
      </div>
      <textarea
        className="studio-prompt-card__field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        aria-readonly={readOnly || undefined}
      />
    </div>
  );
}
