"use client";

/**
 * Idea Lab sandbox UI — presentational Marketing Topic components only.
 * Orchestration hits /api/dev/brain/idea-lab/* exclusively via useIdeaLabSandbox.
 * Does NOT import product Marketing Topic hooks, session storage, or Atom paths.
 *
 * Flow: objective chip → Auto-generate → ranked candidates (complete/limited/insufficient)
 * → select one → six directions. Candidate generation never writes Lab history.
 */
import { Bug } from "lucide-react";

import { PhaseTabBar } from "@/components/dashboard/phase-tab-bar";
import { MarketingTopicHeader } from "@/components/dashboard/marketing-topic/marketing-topic-header";
import { TopicCreationCard } from "@/components/dashboard/marketing-topic/topic-creation-card";
import type { DashboardPhase, HomePhaseStatus } from "@/data/mock-brand";
import {
  IDEA_LAB_PROVIDER_ID,
  TOPIC_TITLE_HOOK_VERSION,
} from "@/brain/evaluation/idea-lab.types";

import { IdeaLabCandidatesPanel } from "./idea-lab-candidates-panel";
import { IdeaLabDirectionsPanel } from "./idea-lab-directions-panel";
import { IdeaLabEvaluationDrawer } from "./idea-lab-evaluation-drawer";
import { IdeaLabResearchAssistPanel } from "./idea-lab-research-assist-panel";
import { IdeaLabTestInspector } from "./idea-lab-test-inspector";
import { useIdeaLabSandbox } from "./use-idea-lab-sandbox";

const TITLE_HOOKS_SHORT =
  TOPIC_TITLE_HOOK_VERSION === "topic-title-hook-v2" ? "v2" : TOPIC_TITLE_HOOK_VERSION;

const LAB_PHASE_STATUSES: Record<DashboardPhase, HomePhaseStatus> = {
  "marketing-topic": "active",
  content: "not_started",
  review: "not_started",
  results: "not_started",
};

export function IdeaLabClient() {
  const lab = useIdeaLabSandbox();

  return (
    <div
      className="w-full animate-fade-in pb-8"
      data-idea-lab-sandbox="true"
      data-testid="idea-lab-root"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span
          className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-text-muted"
          data-testid="idea-lab-dev-badge"
        >
          Idea Lab · Development only · Sandbox
        </span>
        <button
          type="button"
          onClick={lab.openInspector}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          data-testid="open-test-inspector"
        >
          <Bug className="size-3.5" aria-hidden />
          Test Inspector
        </button>
      </div>

      <PhaseTabBar
        activePhase="marketing-topic"
        statuses={LAB_PHASE_STATUSES}
        onChange={() => {
          /* Lab sandbox: later stages stay inactive — no Content/Atom navigation */
        }}
      />

      <div className="mt-3">
        <MarketingTopicHeader compact={lab.hasDirections} />
        <p className="mt-1.5 max-w-2xl text-sm text-text-secondary">
          Select an objective, Auto-generate ranked topics, then pick one to get
          six directions.
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Candidate engine: {IDEA_LAB_PROVIDER_ID} · Title hooks:{" "}
          {TITLE_HOOKS_SHORT} · Isolated from product history
        </p>
      </div>

      <div className="mt-3">
        <TopicCreationCard
          topic={lab.topicDraft}
          onTopicChange={lab.setTopicDraft}
          onGenerate={() => {
            const fromList = lab.candidates?.find(
              (c) => c.topicId === lab.selectedCandidateId
            );
            void lab.generateDirections({
              masterTitle: lab.topicDraft,
              candidate: fromList ?? null,
            });
          }}
          onAutoGenerate={() => {
            void lab.generateCandidates();
          }}
          loading={lab.loading}
          generateDisabled={lab.fixtureBlocked}
          compact={lab.hasDirections}
          marketingFocus={lab.marketingFocus}
          onMarketingFocusChange={lab.handleFocusChange}
          focusError={lab.focusError}
          contextExpanded={lab.contextExpanded}
          onContextExpandedChange={lab.setContextExpanded}
          contextState={lab.contextState}
          onContextChange={lab.setContextState}
        />
        <IdeaLabResearchAssistPanel
          open={lab.contextExpanded}
          prompt={lab.researchPrompt}
          paste={lab.researchPaste}
          status={lab.researchStatus}
          message={lab.researchMessage}
          findingCount={lab.researchImport?.findings.length ?? 0}
          loadingPrompt={lab.loadingResearchPrompt}
          disabled={lab.loading || lab.fixtureBlocked}
          onPasteChange={lab.setResearchPaste}
          onCopyPrompt={() => {
            void lab.copyResearchPrompt();
          }}
          onBuildPrompt={() => {
            void lab.buildResearchPrompt();
          }}
          onValidateAndUse={() => {
            void lab.validateResearchImport();
          }}
          onClear={lab.clearResearchAssist}
        />
      </div>

      {lab.error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {lab.error}
        </p>
      ) : null}

      <IdeaLabCandidatesPanel
        loading={lab.loading}
        pendingMode={lab.pendingMode}
        hasCandidates={lab.hasCandidates}
        hasDirections={lab.hasDirections}
        hasInsufficient={lab.hasInsufficient}
        candidates={lab.candidates}
        candidateCompleteness={lab.candidateCompleteness}
        candidateWarnings={lab.candidateWarnings}
        candidateDiagnostic={lab.candidateDiagnostic}
        selectedCandidateId={lab.selectedCandidateId}
        onSelectCandidate={lab.onSelectCandidate}
      />

      <IdeaLabDirectionsPanel
        loading={lab.loading}
        pendingMode={lab.pendingMode}
        hasDirections={lab.hasDirections}
        brandName={lab.inspect?.brandName ?? "Zynava"}
        variations={lab.variations}
        selectedIdeaId={lab.selectedIdeaId}
        evals={lab.evals}
        onHighlight={lab.setSelectedIdeaId}
        onConfirm={(id) => {
          lab.setSelectedIdeaId(id);
          lab.setEvalOpen(true);
        }}
      />

      <IdeaLabEvaluationDrawer
        open={lab.evalOpen && Boolean(lab.selectedIdeaId)}
        title={lab.selectedTitle}
        ideaId={lab.selectedIdeaId ?? ""}
        value={lab.selectedIdeaId ? lab.evals[lab.selectedIdeaId] : undefined}
        onClose={() => lab.setEvalOpen(false)}
        onChange={(v) =>
          lab.setEvals((prev) => ({ ...prev, [v.ideaId]: v }))
        }
        onSave={() => {
          void lab.saveEvaluation();
        }}
        saving={lab.savingEval}
      />

      <IdeaLabTestInspector
        open={lab.inspectorOpen}
        onClose={() => lab.setInspectorOpen(false)}
        inspect={lab.inspect}
        run={lab.run}
        runs={lab.runs}
        candidatesResult={lab.lastCandidatesResult}
        compareId={lab.compareId}
        onCompareIdChange={lab.setCompareId}
        onResetEvaluation={lab.resetEvaluation}
        onResetLabHistory={lab.resetLabHistory}
        showPaths={lab.showPaths}
        onShowPathsChange={lab.setShowPaths}
      />
    </div>
  );
}
