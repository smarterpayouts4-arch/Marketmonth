"use client";

import { useMemo, useState } from "react";

import type { ContentAtom } from "@/brain/atom/content-atom.schema";
import {
  deriveLimitationBuckets,
  deriveLimitations,
  type LimitationsAcknowledgement,
} from "@/brain/atom/limitations";
import type { AtomValidationReport } from "@/brain/atom/validate/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AtomReviewPanelProps = {
  atom: ContentAtom;
  validation?: AtomValidationReport | null;
  recordRevision?: number;
  busy?: boolean;
  /** Locked / strategy summary — hide approve controls. */
  readOnly?: boolean;
  /** Collapsed by default when true (studio strategy panel). */
  defaultCollapsed?: boolean;
  onApprove?: (ack?: LimitationsAcknowledgement) => void;
  onRequestChanges?: () => void;
  onReviseAtom?: () => void;
  onBackToDirections?: () => void;
};

function Field({
  label,
  value,
}: {
  label: string;
  value: string | undefined | null;
}) {
  if (!value?.trim()) return null;
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className="text-sm leading-relaxed text-foreground">{value}</p>
    </div>
  );
}

/**
 * First-paint Content Studio surface — review the Content Atom kernel before
 * channel specialists run.
 */
export function AtomReviewPanel({
  atom,
  validation,
  recordRevision,
  busy,
  readOnly = false,
  defaultCollapsed = false,
  onApprove,
  onRequestChanges,
  onReviseAtom,
  onBackToDirections,
}: AtomReviewPanelProps) {
  const k = atom.kernel;
  const isLimited = atom.buildStatus === "limited";
  const canApproveBase =
    atom.buildStatus === "complete" || atom.buildStatus === "limited";
  const cannotApprove =
    atom.buildStatus === "insufficient" || atom.buildStatus === "invalid";
  const limitations = useMemo(
    () => deriveLimitations(atom, validation),
    [atom, validation]
  );
  const buckets = useMemo(
    () => deriveLimitationBuckets(atom, validation),
    [atom, validation]
  );
  const [acked, setAcked] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const canApprove =
    canApproveBase && (!isLimited || (acked && limitations.length > 0) || (acked && limitations.length === 0));
  const lockedReadOnly =
    readOnly ||
    atom.approvalStatus === "locked" ||
    atom.approvalStatus === "approved";

  const violations =
    validation?.violations.filter((v) => v.severity === "error") ?? [];
  const warnings =
    validation?.violations.filter((v) => v.severity === "warning") ?? [];
  const statusReasons = validation?.statusReasons ?? [];
  const allViolations = validation?.violations ?? [];
  const craftReport = validation?.craftReport;
  const researchHandoff = validation?.researchHandoff;

  return (
    <section
      className="mx-auto flex w-full max-w-[720px] flex-1 flex-col rounded-xl border border-border bg-card p-5 shadow-soft sm:p-6"
      data-testid="atom-review-panel"
      data-readonly={lockedReadOnly ? "true" : "false"}
      aria-labelledby="atom-review-title"
    >
      <header className="space-y-1 border-b border-border pb-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            {lockedReadOnly
              ? "Strategy behind this content"
              : "Content Atom"}
          </p>
          {defaultCollapsed || lockedReadOnly ? (
            <button
              type="button"
              className="text-xs text-text-secondary underline-offset-2 hover:underline"
              onClick={() => setCollapsed((v) => !v)}
              data-testid="atom-strategy-toggle"
            >
              {collapsed ? "Show strategy" : "Hide strategy"}
            </button>
          ) : null}
        </div>
        <h2
          id="atom-review-title"
          className="font-heading text-xl font-semibold text-foreground"
        >
          {atom.lineage.masterTitle}
        </h2>
        <p className="text-sm text-text-secondary">
          {atom.lineage.angle.replaceAll("_", " ")}
          {atom.lineage.specificTopic
            ? ` · ${atom.lineage.specificTopic}`
            : ""}
        </p>
        <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-text-muted">
          <span className="rounded-md bg-subtle px-2 py-0.5">
            build: {atom.buildStatus}
          </span>
          <span className="rounded-md bg-subtle px-2 py-0.5">
            approval: {atom.approvalStatus}
          </span>
          {recordRevision != null ? (
            <span className="rounded-md bg-subtle px-2 py-0.5">
              rev {recordRevision}
            </span>
          ) : null}
        </div>
      </header>

      {collapsed ? null : (
      <>
      <div className="mt-4 grid flex-1 gap-4 sm:grid-cols-2">
        <Field label="Audience problem" value={k.audience_problem} />
        <Field label="Core tension" value={k.core_tension} />
        <Field
          label="Central claim"
          value={k.central_claim.canonical_wording || k.central_claim.meaning}
        />
        <Field
          label="Belief shift"
          value={`${k.belief_shift.from} → ${k.belief_shift.to}`}
        />
        <Field label="Payoff" value={k.payoff} />
        <Field label="Intended action" value={k.intended_action} />
        <Field
          label="Hook"
          value={k.hook_strategy.opening_intent || k.hook_strategy.planted_question}
        />
        <Field label="Resolution" value={k.resolution || atom.kernel.why_problem_exists} />
      </div>

      {k.supporting_proof.length > 0 ? (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Supporting proof
          </p>
          <ul className="space-y-1.5">
            {k.supporting_proof.slice(0, 4).map((p) => (
              <li key={p.proof_id} className="text-sm text-text-secondary">
                {p.meaning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {craftReport ? (
        <div
          className="mt-4 space-y-2 border-t border-border pt-4"
          data-testid="atom-craft-used"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Craft used
          </p>
          <p className="text-sm text-text-secondary">
            Hook {craftReport.hookQuality}/5 · Story {craftReport.storyCraft}/5 ·{" "}
            {craftReport.craftDnaVersion}
          </p>
          <ul className="space-y-1.5">
            {craftReport.moves.map((m) => (
              <li key={m.id} className="text-sm text-text-secondary">
                <span className="font-medium text-foreground">{m.label}:</span>{" "}
                {m.excerpt || "—"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isLimited || cannotApprove ? (
        <div
          className="mt-4 space-y-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-3"
          data-testid="atom-limitations"
          role="status"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            {cannotApprove
              ? "Cannot approve — reasons"
              : "Before this is ready to publish"}
          </p>
          {!cannotApprove ? (
            <p className="text-sm text-text-secondary">
              We have a strong angle, but details still need verification.
            </p>
          ) : null}
          {buckets.whatWeKnow.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">What we know</p>
              <ul className="space-y-1 text-sm text-text-secondary">
                {buckets.whatWeKnow.slice(0, 4).map((line) => (
                  <li key={`know:${line}`}>• {line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {buckets.whatWeInfer.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">What we infer</p>
              <ul className="space-y-1 text-sm text-text-secondary">
                {buckets.whatWeInfer.slice(0, 4).map((line) => (
                  <li key={`infer:${line}`}>• {line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {(buckets.whatNeedsResearch.length > 0 || limitations.length > 0) ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">
                What needs research
              </p>
              <ul className="space-y-1 text-sm text-text-secondary">
                {(buckets.whatNeedsResearch.length > 0
                  ? buckets.whatNeedsResearch
                  : limitations.length > 0
                    ? limitations
                    : warnings.map((w) => w.message)
                )
                  .slice(0, 8)
                  .map((line) => (
                    <li key={`need:${line}`}>• {line}</li>
                  ))}
              </ul>
            </div>
          ) : null}
          {researchHandoff ? (
            <div
              className="rounded-md border border-border bg-card/60 px-2 py-2"
              data-testid="atom-research-handoff"
            >
              <p className="text-xs font-semibold text-foreground">
                Specialty research brief
              </p>
              <ul className="mt-1 space-y-1 text-sm text-text-secondary">
                {researchHandoff.suggestedChecks.slice(0, 4).map((c) => (
                  <li key={c}>• {c}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {isLimited ? (
            <label className="mt-2 flex items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="mt-1"
                checked={acked}
                onChange={(e) => setAcked(e.target.checked)}
                data-testid="atom-limitations-ack"
              />
              <span>
                I acknowledge these limitations and approve this limited atom
                for channel use as an explicit exception.
              </span>
            </label>
          ) : null}
        </div>
      ) : null}

      {statusReasons.length > 0 ? (
        <div
          className="mt-4 space-y-1 rounded-lg border border-border bg-subtle/40 px-3 py-2 text-sm"
          data-testid="atom-status-reasons"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Inspector status reasons
          </p>
          <ul className="space-y-1 text-text-secondary">
            {statusReasons.map((r) => (
              <li key={`${r.source}:${r.message}`}>
                • [{r.source}] {r.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {allViolations.length > 0 ? (
        <div
          className="mt-4 space-y-1 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
          role="status"
          data-testid="atom-all-violations"
        >
          {allViolations.map((v) => (
            <p key={`${v.code}:${v.path}:${v.message}`}>
              [{v.severity}] {v.code}: {v.message}
            </p>
          ))}
        </div>
      ) : violations.length > 0 ? (
        <div
          className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
          role="status"
        >
          {violations[0]!.message}
        </div>
      ) : null}

      <div className="mt-4 border-t border-border pt-3">
        <button
          type="button"
          className="text-sm text-text-secondary underline-offset-2 hover:underline"
          onClick={() => setShowFull((v) => !v)}
          data-testid="atom-toggle-full"
        >
          {showFull ? "Hide full atom" : "Show full atom"}
        </button>
        {showFull ? (
          <div
            className="mt-3 max-h-[420px] space-y-3 overflow-y-auto rounded-lg border border-border bg-subtle/30 p-3 text-sm"
            data-testid="atom-full-body"
          >
            <Field label="Thesis" value={k.central_claim.canonical_wording} />
            <Field label="CTA intent" value={atom.distributionContract.ctaIntent} />
            <Field
              label="Invariants"
              value={atom.distributionContract.requiredInvariants.join("; ")}
            />
            <Field
              label="Engagement trigger"
              value={atom.engagementBlueprint.strategy?.internalAudienceTrigger}
            />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                Claims
              </p>
              <ul className="mt-1 space-y-1 text-text-secondary">
                {atom.claimLedger.claims.map((c) => (
                  <li key={c.claimId}>
                    [{c.classification}] {c.statement}
                  </li>
                ))}
              </ul>
            </div>
            {warnings.length > 0 ? (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                  Warnings
                </p>
                <ul className="mt-1 space-y-1 text-text-secondary">
                  {warnings.map((w) => (
                    <li key={`${w.code}:${w.message}`}>
                      {w.code}: {w.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {!lockedReadOnly ? (
      <div
        className={cn(
          "mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4"
        )}
      >
        <Button
          type="button"
          disabled={busy || !canApprove || cannotApprove || !onApprove}
          onClick={() => {
            if (!onApprove) return;
            if (isLimited) {
              onApprove({
                acknowledgedAt: new Date().toISOString(),
                limitations:
                  limitations.length > 0
                    ? limitations
                    : atom.missing_information.map((m) => `missing: ${m}`),
              });
            } else {
              onApprove();
            }
          }}
          className="h-9 rounded-lg px-4"
        >
          Approve
        </Button>
        {onReviseAtom ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onReviseAtom}
            className="h-9 rounded-lg px-4"
            data-testid="atom-revise"
          >
            Revise this atom
          </Button>
        ) : null}
        {onRequestChanges ? (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onRequestChanges}
          className="h-9 rounded-lg px-4"
        >
          Request changes
        </Button>
        ) : null}
        {onBackToDirections ? (
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={onBackToDirections}
          className="h-9 rounded-lg px-3 text-text-secondary"
        >
          Choose another direction
        </Button>
        ) : null}
      </div>
      ) : null}
      </>
      )}
    </section>
  );
}
