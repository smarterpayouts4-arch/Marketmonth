import type { IdeaLabRun } from "@/brain/evaluation/idea-lab.types";

export function TraceTab({ run }: { run: IdeaLabRun | null }) {
  if (!run) {
    return (
      <p className="text-xs text-text-muted" data-testid="inspector-trace">
        Generate a run to see the Brain Trace.
      </p>
    );
  }
  return (
    <ol className="space-y-2" data-testid="inspector-trace">
      {run.trace.map((step) => (
        <li
          key={step.step}
          className="rounded-lg border border-border px-3 py-2"
        >
          <details>
            <summary className="cursor-pointer text-sm font-medium">
              {step.step}. {step.stage}{" "}
              <span className="text-xs font-normal text-text-muted">
                ({step.status}
                {step.durationMs != null ? ` · ${step.durationMs}ms` : ""})
              </span>
            </summary>
            <div className="mt-2 space-y-1 font-mono text-[11px] text-text-muted">
              <div>{step.modulePath}</div>
              {step.symbol ? <div>{step.symbol}</div> : null}
              {step.outputSummary ? (
                <pre className="overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(step.outputSummary, null, 2)}
                </pre>
              ) : null}
              {step.warnings?.length ? (
                <div className="text-warning">{step.warnings.join("; ")}</div>
              ) : null}
            </div>
          </details>
        </li>
      ))}
    </ol>
  );
}
