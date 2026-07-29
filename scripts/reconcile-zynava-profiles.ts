/**
 * Phase 0 — Zynava Discovery reconciliation (read-only for approved CSV).
 *
 * Usage:
 *   npm run reconcile:zynava
 *   npm run reconcile:zynava -- --strict
 *   npm run reconcile:zynava -- --analyze-json data/runtime/discovery-reconcile/live-analyze-profile.json
 *
 * Writes only:
 *   data/runtime/discovery-reconcile/reconciliation.json
 *   data/runtime/discovery-reconcile/reconciliation.md
 */
import { config } from "dotenv";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

config({ path: ".env.local" });
config({ path: ".env" });

import {
  buildZynavaReconciliationReport,
  renderReconciliationMarkdown,
} from "../src/engine/discovery/reconcile/build-report";

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function sha256File(p: string): string {
  return createHash("sha256").update(readFileSync(p)).digest("hex");
}

async function maybeFetchAnalyze(
  outPath: string
): Promise<string | undefined> {
  if (!process.argv.includes("--fetch-analyze")) return undefined;
  const base =
    process.env.SITE_ORIGIN?.replace(/\/$/, "") || "http://localhost:3000";
  console.log(`Fetching Analyze from ${base}/api/discovery/analyze …`);
  try {
    const res = await fetch(`${base}/api/discovery/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://zynava.com", forceRefresh: true }),
    });
    const text = await res.text();
    const events = text
      .split(/\n/)
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l) as { type?: string; brandProfile?: unknown; cached?: boolean; pageCount?: number; analysisId?: string };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    const result = [...events]
      .reverse()
      .find((e) => e && e.type === "result") as
      | {
          brandProfile?: Record<string, unknown>;
          cached?: boolean;
          pageCount?: number;
          analysisId?: string;
        }
      | undefined;
    if (!result?.brandProfile) {
      console.warn("Analyze fetch: no result event — continuing without capture");
      return undefined;
    }
    const snap = {
      ...result.brandProfile,
      cached: result.cached,
      pageCount: result.pageCount,
      analysisId: result.analysisId,
      retrievedAt: new Date().toISOString(),
    };
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(snap, null, 2), "utf8");
    console.log(`Wrote analyze capture → ${outPath}`);
    return outPath;
  } catch (err) {
    console.warn(
      "Analyze fetch failed:",
      err instanceof Error ? err.message : err
    );
    return undefined;
  }
}

async function main() {
  const strict = process.argv.includes("--strict");
  const cwd = process.cwd();
  const approvedCsvPath = path.join(
    cwd,
    "data/companies/zynava.com/approved.csv"
  );
  const beforeCsvPath =
    argValue("--before") ||
    path.join(cwd, "data/companies/zynava.com/baseline-2026-07-28.csv");
  const outDir = path.join(cwd, "data/runtime/discovery-reconcile");
  const defaultAnalyzeJson = path.join(outDir, "live-analyze-profile.json");

  if (!existsSync(approvedCsvPath)) {
    throw new Error(`Approved CSV missing: ${approvedCsvPath}`);
  }

  const hashBeforeRun = sha256File(approvedCsvPath);

  let analyzeJson = argValue("--analyze-json");
  if (!analyzeJson && existsSync(defaultAnalyzeJson)) {
    analyzeJson = defaultAnalyzeJson;
  }
  const fetched = await maybeFetchAnalyze(defaultAnalyzeJson);
  if (fetched) analyzeJson = fetched;

  const report = buildZynavaReconciliationReport({
    approvedCsvPath,
    beforeCsvPath: existsSync(beforeCsvPath) ? beforeCsvPath : null,
    analyzeProfilePath: analyzeJson && existsSync(analyzeJson) ? analyzeJson : null,
    frozenCorpusDir: path.join(
      cwd,
      "data/runtime/discovery-pages/zynava.com"
    ),
  });

  mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "reconciliation.json");
  const mdPath = path.join(outDir, "reconciliation.md");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(mdPath, renderReconciliationMarkdown(report), "utf8");

  const hashAfterRun = sha256File(approvedCsvPath);
  if (hashBeforeRun !== hashAfterRun || !report.approvedCsvUnchanged) {
    throw new Error(
      "SAFETY FAILURE: approved CSV changed during reconcile — aborting"
    );
  }

  console.log("Wrote", jsonPath);
  console.log("Wrote", mdPath);
  console.log("Approved CSV unchanged:", report.approvedCsvUnchanged);
  console.log("SHA-256:", report.approvedCsvSha256Before);
  console.log(
    "Omega-3:",
    report.catalogExplanations.find((c) => /omega-3/i.test(c.name))
  );
  console.log(
    "Calcium:",
    report.catalogExplanations.find((c) => /^calcium$/i.test(c.name))
  );
  console.log("Diagnostics:", report.diagnostics);

  if (strict && report.unresolvedObservedContradictions.length > 0) {
    console.error(
      `--strict: ${report.unresolvedObservedContradictions.length} unresolved observed contradiction(s)`
    );
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
