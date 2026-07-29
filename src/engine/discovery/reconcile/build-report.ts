/**
 * Thin orchestrator for Zynava reconciliation reports.
 * Complex logic lives under ./build-report/*
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { loadFrozenCorpus, type FrozenPage } from "./frozen-corpus";
import { loadFixtureFromCsv } from "./fixture-from-projection";
import type { ReconciliationReport } from "./types";

import { simulateCatalogCaps } from "./build-report/catalog-caps";
import {
  buildPageCoverageDiff,
  collectDiffBuckets,
} from "./build-report/collect-diffs";
import {
  CURATED_PLATFORM_CAPABILITIES,
  type AnalyzeProfileSnapshot,
  type BuildReconciliationInput,
} from "./build-report/constants";
import { buildCatalogExplanations } from "./build-report/explain-catalog";
import { sha256File } from "./build-report/hash";
import { loadAnalyzeProfile } from "./build-report/load-analyze-profile";
import { renderReconciliationMarkdown } from "./build-report/render-markdown";
import { synthesizeAnalyzeProfile } from "./build-report/synthesize-analyze";

export {
  CURATED_PLATFORM_CAPABILITIES,
  type AnalyzeProfileSnapshot,
  type BuildReconciliationInput,
};
export { renderReconciliationMarkdown };

/**
 * Pure reconciliation builder. Never writes the approved CSV.
 */
export function buildZynavaReconciliationReport(
  input: BuildReconciliationInput
): ReconciliationReport {
  const diagnostics: string[] = [];
  const approvedCsvSha256Before = sha256File(input.approvedCsvPath);
  const fixture = loadFixtureFromCsv(input.approvedCsvPath);

  const beforePath =
    input.beforeCsvPath && existsSync(input.beforeCsvPath)
      ? input.beforeCsvPath
      : null;
  if (input.beforeCsvPath && !beforePath) {
    diagnostics.push(`Before CSV missing: ${input.beforeCsvPath}`);
  }

  const frozenDir =
    input.frozenCorpusDir ??
    path.join(process.cwd(), "data", "runtime", "discovery-pages", "zynava.com");
  const frozen = loadFrozenCorpus(frozenDir);
  const pages: FrozenPage[] = "pages" in frozen ? frozen.pages : [];
  if ("diagnostics" in frozen) diagnostics.push(...frozen.diagnostics);

  const analyzeLoaded = loadAnalyzeProfile(input);
  diagnostics.push(...analyzeLoaded.diagnostics);

  const { fullCap, withoutExplorerCap } = simulateCatalogCaps(pages);

  let analyze = analyzeLoaded.profile;
  if (!analyze) {
    const synthesized = synthesizeAnalyzeProfile({
      fixture,
      pages,
      withoutExplorerCap,
      fullCap,
    });
    analyze = synthesized.profile;
    diagnostics.push(synthesized.diagnostic);
  }

  const diffs = collectDiffBuckets({ fixture, analyze, pages });

  const catalogExplanations = buildCatalogExplanations({
    fixtureCatalog: diffs.fixtureCatalog,
    analyzeCatalog: diffs.analyzeCatalog,
    pages,
    fullCapNames: fullCap.map((p) => p.name),
    withoutExplorerCapNames: withoutExplorerCap.map((p) => p.name),
  });

  const pageCoverageDiff = buildPageCoverageDiff({ pages, frozenDir });
  const approvedCsvSha256After = sha256File(input.approvedCsvPath);

  return {
    generatedAt: new Date().toISOString(),
    approvedCsvPath: input.approvedCsvPath,
    approvedCsvSha256Before,
    approvedCsvSha256After,
    approvedCsvUnchanged: approvedCsvSha256Before === approvedCsvSha256After,
    beforeCsvPath: beforePath,
    analyzeProfilePath: analyzeLoaded.path,
    frozenCorpusDir: "pages" in frozen ? frozen.dir : frozenDir,
    modelName: "manifest" in frozen ? frozen.manifest.modelName : null,
    extractorNote:
      "Catalog via mergeAndScrubIndexedProducts (cap 8 + priority). Fixture products curated. Analyze products/services LLM-derived.",
    pageCoverageDiff,
    agreedFacts: diffs.agreedFacts,
    fixtureOnly: diffs.fixtureOnly,
    analyzeOnly: diffs.analyzeOnly,
    contradictions: diffs.contradictions,
    missingEvidence: diffs.missingEvidence,
    catalogExplanations,
    productServiceWording: diffs.productServiceWording,
    fieldClasses: diffs.fieldClasses,
    unresolvedObservedContradictions: diffs.contradictions.filter(
      (c) => c.contradiction
    ),
    diagnostics,
  };
}
