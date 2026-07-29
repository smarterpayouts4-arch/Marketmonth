"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { DiscoveryReadMore } from "@/components/discovery/discovery-read-more";
import { DiscoveryScrollRegion } from "@/components/discovery/discovery-scroll-region";
import {
  goalLabel,
  hasRichStrategyDetail,
  reachLabel,
  toStrategyMoves,
} from "@/components/discovery/to-strategy-moves";
import type {
  BrandProfileView,
  DiscoveryIds,
  StrategyIntentAnswers,
  StrategyPreviewView,
} from "@/components/discovery/types";
import { setDiscoveryWorkspaceHandoff } from "@/lib/discovery-handoff";

type DiscoveryStrategyPreviewProps = {
  strategy: StrategyPreviewView;
  businessName: string;
  pageCount: number;
  intent: StrategyIntentAnswers;
  brandProfile: BrandProfileView;
  ids: DiscoveryIds | null;
  onEditPriorities: () => void;
};

export function DiscoveryStrategyPreview({
  strategy,
  businessName,
  pageCount,
  intent,
  brandProfile,
  ids,
  onEditPriorities,
}: DiscoveryStrategyPreviewProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const moves = toStrategyMoves(strategy, intent);
  const formats = strategy.firstCampaign.formats.slice(0, 4);
  const strategyOverflow =
    moves.some((move) => move.overflow) || hasRichStrategyDetail(strategy);

  async function handleCreatePlan() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/create-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: ids?.analysisId,
          brandProfileId: ids?.brandProfileId,
          strategyPreviewId: ids?.strategyPreviewId,
          intent,
          brandProfile,
          strategyPreview: strategy,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        redirectTo?: string;
        requiresAuthentication?: boolean;
        callbackUrl?: string;
        error?: string;
        handoff?: Parameters<typeof setDiscoveryWorkspaceHandoff>[0];
      };

      if (data.requiresAuthentication) {
        // Never send local prototype traffic to Google OAuth (redirect_uri_mismatch).
        // Production / intentional OAuth testing: server only returns this when bypass is off.
        if (process.env.NODE_ENV !== "production") {
          setError(
            "Dev auth bypass is off. Set DEV_AUTH_BYPASS=true in .env.local and restart npm run dev."
          );
          setBusy(false);
          return;
        }
        // Auth.js Google - production path. Redirect URIs must be registered
        // in Google Cloud Console (http://localhost:3000/api/auth/callback/google).
        await signIn("google", {
          callbackUrl: data.callbackUrl ?? "/dashboard",
        });
        return;
      }

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not open your workspace.");
        setBusy(false);
        return;
      }

      if (data.handoff) {
        setDiscoveryWorkspaceHandoff(data.handoff);
      }

      router.push(data.redirectTo ?? "/dashboard");
    } catch {
      setError("Could not open your workspace. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col animate-fade-in">
      <DiscoveryScrollRegion aria-label="Strategy preview">
        <div className="space-y-2.5 pr-1">
          <div>
            <p className="font-display text-[1.05rem] font-semibold tracking-[-0.02em] text-foreground">
              Your {businessName} growth direction
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Built for {goalLabel(intent.goal)} · {reachLabel(intent.reach)} ·{" "}
              {intent.promoteFirst}
            </p>
            <p className="mt-0.5 text-[11px] text-text-muted">
              Based on {Math.max(pageCount, 1)} public pages and 3 confirmed
              priorities
            </p>
          </div>

          <section>
            <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">
              Your three growth moves
            </p>
            <ol className="mt-1.5 space-y-2">
              {moves.map((move) => (
                <li key={move.number} className="flex min-w-0 gap-2.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {move.number}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      {move.headline}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-text-secondary">
                      {move.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-xl border border-primary/25 bg-primary/[0.04] px-3 py-2.5">
            <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">
              Your first campaign
            </p>
            <p className="mt-1 font-display text-sm font-semibold leading-snug text-foreground">
              “{strategy.firstCampaign.hook}”
            </p>
            <p className="mt-1 text-[11px] text-text-secondary">
              One idea becomes {formats.length} formats
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {formats.map((item) => (
                <span
                  key={item.format}
                  className="rounded-full border border-border/80 bg-card px-2 py-0.5 text-[11px] font-medium text-foreground"
                >
                  {item.format}
                </span>
              ))}
            </div>
          </section>

          <DiscoveryReadMore
            title={`${businessName} growth strategy`}
            triggerLabel="Read full strategy"
            overflow={strategyOverflow}
            description="Your full strategy preview from Discovery."
            preview={null}
          >
            <div className="space-y-5">
              <div>
                <p className="font-display text-base font-semibold text-foreground">
                  {strategy.strategyThesis.headline ||
                    `Your ${businessName} growth direction`}
                </p>
                {strategy.strategyThesis.explanation ? (
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {strategy.strategyThesis.explanation}
                  </p>
                ) : null}
                {strategy.strategyThesis.rationale ? (
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {strategy.strategyThesis.rationale}
                  </p>
                ) : null}
              </div>
              <section>
                <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">
                  Your three growth moves
                </p>
                <ol className="mt-2 space-y-3">
                  {moves.map((move) => (
                    <li key={move.number} className="flex gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {move.number}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {move.headlineFull}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                          {move.bodyFull}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
              <section className="rounded-xl border border-primary/25 bg-primary/[0.04] px-4 py-3">
                <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">
                  Your first campaign
                </p>
                <p className="mt-2 font-display text-base font-semibold leading-snug text-foreground">
                  “{strategy.firstCampaign.hook}”
                </p>
                {strategy.firstCampaign.premise ? (
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {strategy.firstCampaign.premise}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {strategy.firstCampaign.formats.map((item) => (
                    <span
                      key={item.format}
                      className="rounded-full border border-border/80 bg-card px-2 py-0.5 text-[11px] font-medium text-foreground"
                    >
                      {item.format}
                      {item.angle ? ` · ${item.angle}` : ""}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          </DiscoveryReadMore>
        </div>
      </DiscoveryScrollRegion>

      <div className="mt-3 flex shrink-0 flex-col gap-2">
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onEditPriorities}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center px-1 text-sm font-medium text-text-secondary hover:text-foreground disabled:opacity-60"
          >
            Edit priorities
          </button>
          <button
            type="button"
            onClick={() => void handleCreatePlan()}
            disabled={busy}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover disabled:opacity-70 sm:w-auto"
          >
            {busy ? "Opening your workspace…" : "Create My 30-Day Plan →"}
          </button>
        </div>
      </div>
    </div>
  );
}
