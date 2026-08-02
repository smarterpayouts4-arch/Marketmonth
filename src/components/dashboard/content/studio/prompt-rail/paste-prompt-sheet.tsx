"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type PastePromptSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sceneLabel: string;
  busy?: boolean;
  error?: string | null;
  onFillScene: (prompt: string) => void | Promise<void | boolean>;
};

export function PastePromptSheet({
  open,
  onOpenChange,
  sceneLabel,
  busy = false,
  error = null,
  onFillScene,
}: PastePromptSheetProps) {
  const [prompt, setPrompt] = useState("");

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        if (!next) setPrompt("");
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="right"
        className="sm:max-w-md"
        data-testid="studio-paste-prompt-sheet"
      >
        <SheetHeader>
          <SheetTitle>Paste scene prompt</SheetTitle>
          <SheetDescription>
            Paste a labeled master brief for {sceneLabel} with Visual Prompt,
            Narration, On-Screen Text, Asset Type, and Motion Prompt (when
            Asset Type is Video). Fields are filled for review — nothing is
            generated until you Save Scene and run each asset step.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-2 px-4">
          <textarea
            className="min-h-[220px] w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-xs text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`SCENE 1\n\nVISUAL PROMPT\n…\n\nNARRATION\n…\n\nON-SCREEN TEXT\n…\n\nASSET TYPE\nvideo\n\nMOTION PROMPT\n…`}
            disabled={busy}
            data-testid="studio-paste-prompt-textarea"
          />
          {error ? (
            <p
              className="text-[11px] text-destructive"
              data-testid="studio-paste-prompt-error"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
            data-testid="studio-paste-prompt-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || !prompt.trim()}
            onClick={() => {
              void onFillScene(prompt.trim());
            }}
            data-testid="studio-paste-prompt-fill"
          >
            {busy ? "Extracting…" : "Fill Scene"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
