/**
 * Pipeline TRACE — terminal/console (browser-safe).
 * JSONL persistence is optional via setPipelineTraceSink (server/scripts only).
 * Never import node:fs here — Idea Lab client bundles pull this module in.
 */

export type PipelineTraceStatus = "ok" | "warn" | "fail";

type TraceCounters = {
  fails: number;
  warns: number;
  rejectionRollup: Record<string, number>;
};

export type PipelineTraceSink = (entry: Record<string, unknown>) => void;

const TRUNCATE_LEN = 160;

let activeCompanyId: string | null = null;
let counters: TraceCounters = freshCounters();
let sink: PipelineTraceSink | null = null;

function freshCounters(): TraceCounters {
  return { fails: 0, warns: 0, rejectionRollup: {} };
}

function traceEnabled(): boolean {
  try {
    const v = process.env.MM_PIPELINE_TRACE?.trim();
    return v === "1" || v === "verbose" || v?.toLowerCase() === "true";
  } catch {
    return false;
  }
}

export function isPipelineTraceVerbose(): boolean {
  try {
    return process.env.MM_PIPELINE_TRACE?.trim() === "verbose";
  } catch {
    return false;
  }
}

/** Register a server-only JSONL (or other) sink. Client leaves this unset. */
export function setPipelineTraceSink(next: PipelineTraceSink | null): void {
  sink = next;
}

/** Truncate long blobs for terminal/JSONL; never dump full evidence. */
export function truncateTraceText(text: string, max = TRUNCATE_LEN): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…(+${t.length - max})`;
}

function scrubFields(
  fields: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === "string") {
      out[k] = truncateTraceText(
        v.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
      );
    } else if (Array.isArray(v)) {
      out[k] = v.slice(0, 8).map((item) =>
        typeof item === "string" ? truncateTraceText(item) : item
      );
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Begin a traced company run (banner). No-op when TRACE off.
 * Callers that want JSONL should setPipelineTraceSink first (see pipeline-trace-persist).
 */
export function beginPipelineTrace(companyId: string): void {
  if (!traceEnabled()) return;
  activeCompanyId = companyId;
  counters = freshCounters();
  console.info(`========== MM PIPELINE TRACE: ${companyId} ==========`);
  pipelineTrace("pipeline.start", { company: companyId }, "ok");
}

export function endPipelineTrace(extra?: Record<string, unknown>): void {
  if (!traceEnabled()) return;
  const company = activeCompanyId ?? "unknown";
  pipelineTrace(
    "pipeline.end",
    {
      company,
      fails: counters.fails,
      warns: counters.warns,
      rejection_rollup: { ...counters.rejectionRollup },
      ...extra,
    },
    counters.fails > 0 ? "fail" : counters.warns > 0 ? "warn" : "ok"
  );
  console.info(
    `========== MM PIPELINE TRACE END (fails=${counters.fails} warns=${counters.warns}) ==========`
  );
  if (Object.keys(counters.rejectionRollup).length) {
    console.info(
      `  rejection_rollup: ${JSON.stringify(counters.rejectionRollup)}`
    );
  }
  activeCompanyId = null;
  sink = null;
}

export function getRejectionRollup(): Record<string, number> {
  return { ...counters.rejectionRollup };
}

export function recordSubjectRejection(reason: string): void {
  counters.rejectionRollup[reason] =
    (counters.rejectionRollup[reason] ?? 0) + 1;
}

/**
 * Structured hop log. Primary sink: terminal/console.
 * Secondary: optional registered sink (JSONL on server/scripts).
 */
export function pipelineTrace(
  stage: string,
  fields: Record<string, unknown> = {},
  status: PipelineTraceStatus = "ok"
): void {
  if (!traceEnabled()) return;

  if (status === "fail") counters.fails += 1;
  if (status === "warn") counters.warns += 1;

  const safe = scrubFields(fields);
  const company =
    (typeof safe.company === "string" && safe.company) ||
    activeCompanyId ||
    "";
  const pad = status === "ok" ? "ok  " : status === "warn" ? "warn" : "fail";
  const detail = Object.entries(safe)
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(" ");
  const line = `[mm-trace][${pad}][${stage}] ${detail}`.trim();

  if (status === "fail") console.error(line);
  else if (status === "warn") console.warn(line);
  else console.info(line);

  if (!sink) return;
  try {
    sink({
      ts: new Date().toISOString(),
      status,
      stage,
      company,
      ...safe,
    });
  } catch {
    /* never break the pipeline for logging */
  }
}

export function pipelineStage(
  stage: string,
  status: PipelineTraceStatus,
  summary: string,
  fields: Record<string, unknown> = {}
): void {
  pipelineTrace(stage, { summary, ...fields }, status);
}

/** Test helpers — reset in-memory state between tests. */
export const __pipelineTraceTestables = {
  reset() {
    activeCompanyId = null;
    counters = freshCounters();
    sink = null;
  },
  isEnabled: traceEnabled,
};
