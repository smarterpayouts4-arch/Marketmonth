import type {
  IdeaLabInspectResult,
  IdeaLabRun,
} from "@/brain/evaluation/idea-lab.types";

import { Row } from "./row";

export function OverviewTab({
  inspect,
  run,
  showPaths,
}: {
  inspect: IdeaLabInspectResult | null;
  run: IdeaLabRun | null;
  showPaths: boolean;
}) {
  const csvValid = inspect ? !inspect.parseError : null;
  return (
    <dl className="space-y-3" data-testid="inspector-overview">
      <Row label="Fixture" value={inspect?.fixtureName ?? "—"} />
      <Row
        label="CSV status"
        value={
          csvValid == null ? "—" : csvValid ? "Valid" : "Invalid"
        }
      />
      <Row label="Rows" value={String(inspect?.rowCount ?? "—")} />
      <Row label="Evidence count" value={String(inspect?.evidenceCount ?? "—")} />
      <Row
        label="Brand Core identity"
        value={
          inspect?.brandCoreId
            ? `${inspect.brandCoreId} · v${inspect.brandCoreVersion} · ${inspect.brandCoreHash}`
            : "—"
        }
      />
      <Row
        label="Lab-history records"
        value={String(inspect?.labHistoryRecordCount ?? "—")}
      />
      <Row label="Active provider" value="deterministic-v1" />
      <Row
        label="Generator version"
        value={run?.input.generatorVersion ?? "deterministic-directions-v1"}
      />
      <Row
        label="Last run duration"
        value={run ? `${run.durationMs}ms` : "—"}
      />
      <Row
        label="History persisted"
        value={
          run
            ? run.historyPersisted
              ? "Yes"
              : "No"
            : "—"
        }
      />
      <Row label="Idea Lab history" value="Isolated" />
      <Row label="Product history" value="Untouched" />
      {showPaths ? (
        <>
          <Row
            label="Lab history path"
            value={inspect?.historyRepositoryPath ?? "—"}
            mono
          />
          <Row
            label="Product history path"
            value={inspect?.productHistoryPath ?? "—"}
            mono
          />
        </>
      ) : null}
      {inspect?.parseError ? (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {inspect.parseError}
        </p>
      ) : null}
      {run?.historyWarning ? (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
          {run.historyWarning}
        </p>
      ) : null}
    </dl>
  );
}
