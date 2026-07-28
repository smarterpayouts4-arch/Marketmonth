"use client";

import { useEffect, useState, useTransition } from "react";

type StatusPayload = {
  strategy: {
    lastRefreshedAt: string | null;
    newFindings: number;
    highPriority: number;
    changesSincePrevious: number;
    staleAfterDays: number;
  };
  stale: boolean;
  latestBrief: {
    id: string;
    generatedAt: string;
    recommendations: {
      id: string;
      finding: string;
      impact: string;
      status: string;
      recommendation: string;
      affectedFiles: string[];
    }[];
  } | null;
  phase2Feedback: {
    searchConsole: { status: string; message: string };
    bing: { status: string; message: string };
    analytics: { status: string; message: string };
  };
};

function formatWhen(iso: string | null): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function SeoStatusPanel() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/seo/status");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load status");
        setStatus(data as StatusPayload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    });
  }

  function refresh(auditsOnly: boolean) {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/seo/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auditsOnly }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Refresh failed");
        load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Refresh failed");
      }
    });
  }

  useEffect(() => {
    load();
     
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">SEO intelligence</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Reads the latest Change Brief. Full internet research runs on a
            weekly or on-demand job — not on every login.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => refresh(true)}
            className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Audit refresh
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => refresh(false)}
            className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            Refresh with research
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {status ? (
        <div className="mt-5 space-y-4">
          <p className="text-sm text-text-secondary">
            SEO intelligence last refreshed:{" "}
            <span className="font-medium text-foreground">
              {formatWhen(status.strategy.lastRefreshedAt)}
            </span>
            {status.stale ? (
              <span className="ml-2 text-amber-700 dark:text-amber-400">
                (stale — older than {status.strategy.staleAfterDays} days)
              </span>
            ) : null}
          </p>
          <ul className="grid gap-2 text-sm sm:grid-cols-3">
            <li className="rounded-xl bg-muted/50 px-3 py-2">
              <span className="text-text-muted">New findings</span>
              <p className="text-lg font-semibold">{status.strategy.newFindings}</p>
            </li>
            <li className="rounded-xl bg-muted/50 px-3 py-2">
              <span className="text-text-muted">High priority</span>
              <p className="text-lg font-semibold">
                {status.strategy.highPriority}
              </p>
            </li>
            <li className="rounded-xl bg-muted/50 px-3 py-2">
              <span className="text-text-muted">Changes vs previous</span>
              <p className="text-lg font-semibold">
                {status.strategy.changesSincePrevious}
              </p>
            </li>
          </ul>

          {status.latestBrief?.recommendations?.length ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Latest Change Brief</h3>
              <ul className="space-y-3">
                {status.latestBrief.recommendations.slice(0, 5).map((rec) => (
                  <li
                    key={rec.id}
                    className="rounded-xl border border-border/80 px-3 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{rec.impact}</span>
                      <span className="text-text-muted">· {rec.status}</span>
                    </div>
                    <p className="mt-1 text-foreground">{rec.finding}</p>
                    <p className="mt-1 text-text-secondary">{rec.recommendation}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      Files: {rec.affectedFiles.join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-text-muted">
              No brief yet. Run an audit refresh to generate the first report.
            </p>
          )}

          <div className="rounded-xl border border-dashed border-border px-3 py-3 text-xs text-text-muted">
            Phase 2 feedback: {status.phase2Feedback.searchConsole.message}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-text-muted">
          {pending ? "Loading…" : "No status loaded"}
        </p>
      )}
    </section>
  );
}
