"use client";

import { useState } from "react";

import type { ContentDirectionsHandoffV1 } from "@/brain/content/types";

import type {
  ContentAtom,
  ContentChannel,
  ProductionPackage,
} from "../types";
import { AdapterPanel } from "./adapter-panel";
import { AtomPanel } from "./atom-panel";
import { HookPanel } from "./hook-panel";
import {
  PromptInspectorTabs,
  type PromptInspectorTab,
} from "./prompt-inspector-tabs";
import { PromptPanel } from "./prompt-panel";
import { SourcePanel } from "./source-panel";

type PromptInspectorProps = {
  handoff: ContentDirectionsHandoffV1;
  atom: ContentAtom | null;
  pkg: ProductionPackage | null;
  channel: ContentChannel;
};

export function PromptInspector({
  handoff,
  atom,
  pkg,
  channel,
}: PromptInspectorProps) {
  const [tab, setTab] = useState<PromptInspectorTab>("directions");

  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col rounded-xl border border-border bg-card p-3 shadow-soft"
      aria-label="Prompt Inspector"
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          Prompt Inspector{" "}
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-900 uppercase">
            Dev only
          </span>
        </h2>
      </div>
      <p className="mt-0.5 shrink-0 text-[10px] leading-snug text-text-secondary">
        Internal debugging — Directions → Atom → YouTube Short.
      </p>

      <div className="mt-1.5 shrink-0">
        <PromptInspectorTabs active={tab} onChange={setTab} />
      </div>

      <div
        id={`inspector-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`inspector-tab-${tab}`}
        className="mt-1.5 flex min-h-0 flex-1 flex-col overflow-y-auto pr-0.5"
      >
        {tab === "directions" ? <SourcePanel handoff={handoff} /> : null}
        {tab === "atom" ? (
          <div className="space-y-4">
            <AtomPanel atom={atom} />
            <HookPanel atom={atom} />
          </div>
        ) : null}
        {tab === "youtube_short" ? (
          <AdapterPanel channel={channel} pkg={pkg} />
        ) : null}
        {tab === "prompt" ? (
          <PromptPanel
            handoff={handoff}
            atom={atom}
            pkg={pkg}
            channel={channel}
          />
        ) : null}
      </div>
    </aside>
  );
}
