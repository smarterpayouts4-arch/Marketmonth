"use client";

import { useRef, useState } from "react";

import type { ContentDirectionsHandoffV1 } from "@/brain/content/types";
import { Button } from "@/components/ui/button";

import type {
  ContentAtom,
  ContentChannel,
  ProductionPackage,
} from "../types";
import { FullPromptDialog } from "./full-prompt-dialog";

export function buildStudioPrompt(args: {
  handoff: ContentDirectionsHandoffV1;
  atom: ContentAtom | null;
  pkg: ProductionPackage | null;
  channel: ContentChannel;
}): string {
  const { handoff, atom, pkg, channel } = args;
  return [
    "# Content Studio Prompt",
    `Channel: ${channel}`,
    `Format: ${pkg?.format ?? "n/a"}`,
    "",
    "## Strategy",
    `Master topic: ${handoff.masterTopic.punchline}`,
    `Variation: ${
      handoff.variations.find((v) => v.id === handoff.selectedVariationId)
        ?.punchline ?? handoff.selectedVariationId
    }`,
    handoff.marketingFocus ? `Focus: ${handoff.marketingFocus}` : null,
    "",
    "## Content Atom",
    atom
      ? [
          `Audience: ${atom.audience.state}`,
          `Belief shift: ${atom.desired_belief_shift.from} → ${atom.desired_belief_shift.to}`,
          `Claim: ${atom.central_claim.canonical_wording}`,
          `Hook: ${atom.hook_strategy.opening_intent}`,
          `Action: ${atom.intended_action}`,
          `Status: ${atom.status}`,
        ].join("\n")
      : "(not loaded)",
    "",
    "## YouTube Short Package",
    pkg
      ? [
          `Headline: ${pkg.copy.headline ?? ""}`,
          `Spoken hook: ${pkg.copy.openingLine ?? ""}`,
          `Script: ${pkg.copy.body ?? ""}`,
          `Image prompt: ${pkg.visual.imagePrompt ?? ""}`,
          `Visual direction: ${pkg.visual.visualDirection}`,
          `CTA: ${pkg.cta.label}`,
        ].join("\n")
      : "(not loaded)",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

type PromptPanelProps = {
  handoff: ContentDirectionsHandoffV1;
  atom: ContentAtom | null;
  pkg: ProductionPackage | null;
  channel: ContentChannel;
};

export function PromptPanel({
  handoff,
  atom,
  pkg,
  channel,
}: PromptPanelProps) {
  const prompt = buildStudioPrompt({ handoff, atom, pkg, channel });
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement | null>(null);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <pre className="min-h-[280px] flex-1 overflow-auto rounded-md border border-border bg-muted/40 p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
        {prompt}
      </pre>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => {
            void copyPrompt();
          }}
        >
          {copied ? "Copied" : "Copy Prompt"}
        </Button>
        <button
          ref={openButtonRef}
          type="button"
          className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => setDialogOpen(true)}
        >
          Open Full Prompt
        </button>
        <span className="sr-only" aria-live="polite">
          {copied ? "Prompt copied to clipboard" : ""}
        </span>
      </div>
      <FullPromptDialog
        open={dialogOpen}
        prompt={prompt}
        onClose={() => setDialogOpen(false)}
        onCopy={() => {
          void copyPrompt();
        }}
        returnFocusRef={openButtonRef}
      />
    </div>
  );
}
