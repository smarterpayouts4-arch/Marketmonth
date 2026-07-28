"use client";

import type { BlockedDirectionResult } from "./types";

type TopicBlockedStateProps = {
  result: BlockedDirectionResult;
};

export function TopicBlockedState({ result }: TopicBlockedStateProps) {
  return (
    <div
      className="mt-10 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-8"
      role="alert"
    >
      <p className="text-xs font-semibold tracking-[0.12em] text-text-muted uppercase">
        Cannot create directions yet
      </p>
      <h3 className="mt-2 text-lg font-semibold text-foreground">
        Brand context is incomplete or the topic was blocked
      </h3>
      {result.missingFields.length > 0 ? (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-text-secondary">
          {result.missingFields.map((field) => (
            <li key={field}>Missing: {field}</li>
          ))}
        </ul>
      ) : null}
      {result.warnings.length > 0 ? (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-text-muted">
          {result.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      <p className="mt-4 text-sm text-text-secondary">
        No direction cards are shown until a valid master topic can be generated.
      </p>
    </div>
  );
}
