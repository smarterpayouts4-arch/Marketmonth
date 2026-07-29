"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

import type {
  IdeaLabInspectResult,
  IdeaLabRun,
} from "@/brain/evaluation/idea-lab.types";
import type { IdeaLabCandidatesResult } from "@/brain/evaluation/topic-candidate-types";

import { CandidatesTab } from "./ili/candidates-tab";
import { ControlsTab } from "./ili/controls-tab";
import { EvidenceTab } from "./ili/evidence-tab";
import { HistoryTab } from "./ili/history-tab";
import { InputsTab } from "./ili/inputs-tab";
import { OverviewTab } from "./ili/overview-tab";
import { TraceTab } from "./ili/trace-tab";

type TabId =
  | "overview"
  | "candidates"
  | "evidence"
  | "inputs"
  | "trace"
  | "history"
  | "controls";

type Props = {
  open: boolean;
  onClose: () => void;
  inspect: IdeaLabInspectResult | null;
  run: IdeaLabRun | null;
  runs: IdeaLabRun[];
  candidatesResult: IdeaLabCandidatesResult | null;
  compareId: string;
  onCompareIdChange: (id: string) => void;
  onResetEvaluation: () => void;
  onResetLabHistory: () => void;
  showPaths: boolean;
  onShowPathsChange: (v: boolean) => void;
};

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "candidates", label: "Candidates" },
  { id: "evidence", label: "Evidence" },
  { id: "inputs", label: "Inputs" },
  { id: "trace", label: "Brain Trace" },
  { id: "history", label: "Run History" },
  { id: "controls", label: "Controls" },
];

export function IdeaLabTestInspector({
  open,
  onClose,
  inspect,
  run,
  runs,
  candidatesResult,
  compareId,
  onCompareIdChange,
  onResetEvaluation,
  onResetLabHistory,
  showPaths,
  onShowPathsChange,
}: Props) {
  const [tab, setTab] = useState<TabId>("overview");

  const compareRun = useMemo(
    () => runs.find((r) => r.runId === compareId) ?? null,
    [runs, compareId]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex justify-end bg-black/35"
      role="dialog"
      aria-modal="true"
      aria-labelledby="idea-lab-inspector-title"
      data-idea-lab-inspector="open"
    >
      <button
        type="button"
        className="h-full flex-1 cursor-default"
        aria-label="Close Test Inspector"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2
              id="idea-lab-inspector-title"
              className="text-base font-semibold text-foreground"
            >
              Test Inspector
            </h2>
            <p className="text-xs text-text-muted">
              Sandbox diagnostics · product brand & history untouched
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-muted"
            aria-label="Close Test Inspector"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                tab === t.id
                  ? "rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground"
                  : "rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted hover:bg-muted"
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm">
          {tab === "overview" ? (
            <OverviewTab inspect={inspect} run={run} showPaths={showPaths} />
          ) : null}
          {tab === "candidates" ? (
            <CandidatesTab result={candidatesResult} />
          ) : null}
          {tab === "evidence" ? (
            <EvidenceTab result={candidatesResult} />
          ) : null}
          {tab === "inputs" ? <InputsTab run={run} inspect={inspect} /> : null}
          {tab === "trace" ? <TraceTab run={run} /> : null}
          {tab === "history" ? (
            <HistoryTab
              runs={runs}
              run={run}
              compareId={compareId}
              compareRun={compareRun}
              onCompareIdChange={onCompareIdChange}
            />
          ) : null}
          {tab === "controls" ? (
            <ControlsTab
              showPaths={showPaths}
              onShowPathsChange={onShowPathsChange}
              onResetEvaluation={onResetEvaluation}
              onResetLabHistory={onResetLabHistory}
              historyPath={inspect?.historyRepositoryPath}
              productPath={inspect?.productHistoryPath}
            />
          ) : null}
        </div>
      </aside>
    </div>
  );
}
