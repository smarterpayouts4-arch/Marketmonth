import type { IdeaLabRun } from "@/brain/evaluation/idea-lab.types";
import { overallAverage } from "@/brain/evaluation/idea-quality.schema";

import { CompareMini } from "./compare-mini";

export function HistoryTab({
  runs,
  run,
  compareId,
  compareRun,
  onCompareIdChange,
}: {
  runs: IdeaLabRun[];
  run: IdeaLabRun | null;
  compareId: string;
  compareRun: IdeaLabRun | null;
  onCompareIdChange: (id: string) => void;
}) {
  return (
    <div className="space-y-3" data-testid="inspector-history">
      <p className="text-xs text-text-muted">
        Latest 5 Idea Lab evaluation runs (sandbox store only).
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-text-muted">
            <tr>
              <th className="px-2 py-2 font-medium">Run</th>
              <th className="px-2 py-2 font-medium">Topic</th>
              <th className="px-2 py-2 font-medium">ms</th>
              <th className="px-2 py-2 font-medium">Hist</th>
              <th className="px-2 py-2 font-medium">Avg</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.runId} className="border-t border-border">
                <td className="px-2 py-2 font-mono text-[10px]">{r.runId}</td>
                <td className="max-w-[140px] truncate px-2 py-2">
                  {r.generation.masterTopic || "(blocked)"}
                </td>
                <td className="px-2 py-2">{r.durationMs}</td>
                <td className="px-2 py-2">
                  {r.historyPersisted ? "yes" : "no"}
                </td>
                <td className="px-2 py-2">
                  {r.evaluation
                    ? overallAverage(r.evaluation.ideas)?.toFixed(1) ?? "—"
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label className="block text-xs">
        Compare with
        <select
          className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5"
          value={compareId}
          onChange={(e) => onCompareIdChange(e.target.value)}
        >
          <option value="">—</option>
          {runs
            .filter((r) => r.runId !== run?.runId)
            .map((r) => (
              <option key={r.runId} value={r.runId}>
                {r.runId}
              </option>
            ))}
        </select>
      </label>
      {run && compareRun ? (
        <div className="grid gap-2 sm:grid-cols-2 text-xs">
          <CompareMini title="A" r={run} />
          <CompareMini title="B" r={compareRun} />
        </div>
      ) : null}
    </div>
  );
}
