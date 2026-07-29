/**
 * Provenance log for the company-profile pipeline.
 *
 * One question this answers: for a given run, did Branch A (activation card)
 * and Branch B (topic generation) read the same artifact, and did either of
 * them read anything else? Every read and write of a company profile records
 * the artifact hash it saw, so a divergence is visible instead of inferred.
 *
 * Disabled unless a sink is installed or MM_PROVENANCE=1, so importing this
 * from runtime code costs nothing in production.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

/** Which side of the split produced the event. */
export type ProvenanceBranch =
  | "write"
  | "branch-a"
  | "branch-b"
  | "publish";

/** Where the data in this step came from. Anything other than an
 *  `artifact:*` value on a branch read means the branch bypassed the CSV. */
export type ProvenanceSource =
  | "crawl"
  | "memory"
  | "neon"
  | "artifact:draft"
  | "artifact:approved"
  /** Read straight off the filesystem, bypassing the artifact reader. */
  | "disk:direct"
  | "derived";

export type ProvenanceEvent = {
  ts: string;
  correlationId: string;
  branch: ProvenanceBranch;
  step: string;
  companyId: string;
  source: ProvenanceSource;
  artifactHash?: string;
  detail?: Record<string, unknown>;
};

export type ProvenanceSink = (event: ProvenanceEvent) => void;

let sinks: ProvenanceSink[] = [];
let currentCorrelationId: string | null = null;

export function setCorrelationId(id: string | null): void {
  currentCorrelationId = id;
}

export function getCorrelationId(): string | null {
  return currentCorrelationId;
}

export function addProvenanceSink(sink: ProvenanceSink): () => void {
  sinks.push(sink);
  return () => {
    sinks = sinks.filter((s) => s !== sink);
  };
}

export function clearProvenanceSinks(): void {
  sinks = [];
}

function enabled(): boolean {
  return sinks.length > 0 || process.env.MM_PROVENANCE === "1";
}

export function recordProvenance(
  event: Omit<ProvenanceEvent, "ts" | "correlationId"> & {
    correlationId?: string;
  }
): void {
  if (!enabled()) return;
  const full: ProvenanceEvent = {
    ts: new Date().toISOString(),
    correlationId: event.correlationId ?? currentCorrelationId ?? "no-run",
    branch: event.branch,
    step: event.step,
    companyId: event.companyId,
    source: event.source,
    artifactHash: event.artifactHash,
    detail: event.detail,
  };
  for (const sink of sinks) {
    try {
      sink(full);
    } catch {
      // A broken sink must never break the pipeline it observes.
    }
  }
  if (sinks.length === 0 && process.env.MM_PROVENANCE === "1") {
    consoleSink(full);
  }
}

export function consoleSink(event: ProvenanceEvent): void {
  const hash = event.artifactHash ? ` hash=${event.artifactHash}` : "";
  const detail = event.detail ? ` ${JSON.stringify(event.detail)}` : "";
  console.log(
    `  [prov] ${event.branch.padEnd(8)} ${event.step.padEnd(28)} src=${event.source}${hash}${detail}`
  );
}

export function createJsonlSink(filePath: string): ProvenanceSink {
  mkdirSync(path.dirname(filePath), { recursive: true });
  return (event) => {
    try {
      appendFileSync(filePath, `${JSON.stringify(event)}\n`, "utf8");
    } catch {
      // Best effort; the console sink still carries the run.
    }
  };
}

export function createMemorySink(): {
  sink: ProvenanceSink;
  events: ProvenanceEvent[];
} {
  const events: ProvenanceEvent[] = [];
  return { sink: (event) => events.push(event), events };
}

/**
 * Reads a branch performed that did not come from a company profile artifact.
 * These are the leaks: a branch getting company data from somewhere else.
 */
export function findBranchLeaks(events: ProvenanceEvent[]): ProvenanceEvent[] {
  return events.filter(
    (e) =>
      (e.branch === "branch-a" || e.branch === "branch-b") &&
      !e.source.startsWith("artifact:")
  );
}

/** Distinct artifact hashes each branch read. Both branches should see one, and the same one. */
export function artifactHashesByBranch(
  events: ProvenanceEvent[]
): Record<string, string[]> {
  const out: Record<string, Set<string>> = {};
  for (const e of events) {
    if (!e.artifactHash) continue;
    (out[e.branch] ??= new Set()).add(e.artifactHash);
  }
  return Object.fromEntries(
    Object.entries(out).map(([branch, set]) => [branch, [...set]])
  );
}
