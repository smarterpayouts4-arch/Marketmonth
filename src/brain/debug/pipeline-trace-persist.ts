/**
 * Server/script-only JSONL sink for pipeline TRACE.
 * Do not import from client components or shared browser graphs.
 */

import fs from "node:fs";
import path from "node:path";

import { setPipelineTraceSink } from "./pipeline-trace";

const MAX_RUNS_PER_COMPANY = 5;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

function runtimeDir(): string {
  return path.join(process.cwd(), "data", "runtime");
}

function rotateCompanyTraces(companyId: string): void {
  const dir = runtimeDir();
  if (!fs.existsSync(dir)) return;
  const prefix = `pipeline-trace-${companyId}-`;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".jsonl"))
    .map((f) => ({
      name: f,
      full: path.join(dir, f),
      mtime: fs.statSync(path.join(dir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const stale of files.slice(MAX_RUNS_PER_COMPANY)) {
    try {
      fs.unlinkSync(stale.full);
    } catch {
      /* ignore */
    }
  }
}

/** Open a rotating JSONL file and register it as the active TRACE sink. */
export function openPipelineTraceJsonl(companyId: string): string {
  const dir = runtimeDir();
  fs.mkdirSync(dir, { recursive: true });
  rotateCompanyTraces(companyId);
  const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
  let jsonlPath = path.join(
    dir,
    `pipeline-trace-${companyId}-${runStamp}.jsonl`
  );

  setPipelineTraceSink((entry) => {
    try {
      const stat = fs.existsSync(jsonlPath) ? fs.statSync(jsonlPath) : null;
      if (stat && stat.size > MAX_FILE_BYTES) {
        jsonlPath = jsonlPath.replace(
          /\.jsonl$/,
          `-cont-${Date.now()}.jsonl`
        );
        rotateCompanyTraces(companyId);
      }
      fs.appendFileSync(jsonlPath, `${JSON.stringify(entry)}\n`, "utf8");
    } catch {
      /* never break the pipeline for logging */
    }
  });

  return jsonlPath;
}

export const __pipelineTracePersistTestables = {
  maxRuns: MAX_RUNS_PER_COMPANY,
  maxFileBytes: MAX_FILE_BYTES,
};
