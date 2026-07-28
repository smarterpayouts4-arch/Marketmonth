/**
 * Thin orchestrator: quality evidence collectors.
 * Specialists live in ./quality-collect/*
 */
import fs from "node:fs";
import path from "node:path";
import { runGuardian } from "../guardian.mjs";
import {
  buildArtifactBundle,
  buildGeneratedContents,
  normalizeText,
} from "./scan.mjs";
import { walkFiles } from "./scan/fs.mjs";
import { loadOwnershipRules } from "./scan/ownership.mjs";
import { detectCycles } from "./quality-collect/cycles.mjs";
import { collectDocFindings } from "./quality-collect/docs.mjs";
import { runProbeChecks, runRouteResolverTest } from "./quality-collect/probes.mjs";
import { scanSrcFindings } from "./quality-collect/scan-src.mjs";
import { NOT_EVALUATED } from "./quality-collect/util.mjs";

export { NOT_EVALUATED };

/**
 * @param {string} root
 * @param {object} rules
 * @param {{ withProbes?: boolean }} [options]
 */
export function collectQualityEvidence(root, rules, options = {}) {
  const withProbes = options.withProbes !== false;
  const thresholds = rules.thresholds || {};
  const lineLimit = thresholds.oversizedFileLines ?? 500;
  const exportLimit = thresholds.excessiveExports ?? 25;
  const staleDays = thresholds.staleDocDays ?? 45;
  const mixedLayerMin = thresholds.mixedLayerMin ?? 3;

  const bundle = buildArtifactBundle(root);
  const guardian = runGuardian(root);
  const ownershipRules = loadOwnershipRules(root);

  const srcRoot = path.join(root, "src");
  const srcFiles = walkFiles(srcRoot, (f) =>
    /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f)
  );

  const src = scanSrcFindings(root, srcFiles, {
    oversizedFileLines: lineLimit,
    excessiveExports: exportLimit,
    mixedLayerMin,
  });

  const nextPublicSecrets = [];
  for (const row of bundle.envRows) {
    if (
      row.variable.startsWith("NEXT_PUBLIC_") &&
      /(SECRET|PASSWORD|PRIVATE_KEY|API_KEY|TOKEN)/i.test(row.variable)
    ) {
      nextPublicSecrets.push(row.variable);
    }
  }

  const cycles = detectCycles(root, srcFiles);

  const { files: expectedGenerated } = buildGeneratedContents(root);
  const staleMaps = [];
  for (const [rel, expected] of Object.entries(expectedGenerated)) {
    if (rel.startsWith("reports/")) continue;
    const full = path.join(root, "project-knowledge", "generated", rel);
    if (!fs.existsSync(full)) {
      staleMaps.push(`missing generated/${rel}`);
      continue;
    }
    if (
      normalizeText(fs.readFileSync(full, "utf8")) !==
      normalizeText(expected)
    ) {
      staleMaps.push(`stale generated/${rel}`);
    }
  }

  const productHard = guardian.hard.filter((h) =>
    /PK-HARD-00[1-4]/.test(h.code)
  );
  const boundaryHard = guardian.hard.filter((h) =>
    /PK-HARD-00[6-8]/.test(h.code)
  );
  const boundarySoft = guardian.soft.filter((w) =>
    /PK-WARN-00[4-7]/.test(w.code)
  );

  const docs = collectDocFindings(root, ownershipRules, staleDays);
  const routeTestFail = runRouteResolverTest(root);

  const featureTests = walkFiles(srcRoot, (f, name) =>
    /\.(test|spec)\.(ts|tsx|js|jsx|mjs)$/.test(name)
  );
  const pkTests = walkFiles(
    path.join(root, "project-knowledge", "tests"),
    () => true
  );

  const undocumented = bundle.envRows
    .filter((e) => e.classification === "undocumented")
    .map((e) => e.variable);

  /** @type {Record<string, string[]>} */
  const byCheck = {
    duplicate_routes: bundle.duplicateRoutes.map(
      (d) => `${d.route} → ${d.files.join(", ")}`
    ),
    dependency_boundary_violations: [
      ...boundaryHard.map((h) => `${h.code}: ${h.message}`),
      ...boundarySoft.map((w) => `${w.code}: ${w.message}`),
      ...src.uiDb,
    ],
    product_authority_hard: productHard.map(
      (h) => `${h.code}: ${h.message}`
    ),
    oversized_source_files: src.oversized,
    ownership_rules_schema: ownershipRules.schemaVersion
      ? []
      : ["ownership-rules.json missing schemaVersion"],
    unowned_src_paths: bundle.ownership.unowned.slice(),
    expired_ownership_exceptions: docs.expired.map(
      (ex) =>
        `${ex.code || ex.rule || "exception"} path=${ex.path} expired=${ex.expires}`
    ),
    stale_generated_maps: staleMaps,
    current_state_freshness: docs.currentStateStale,
    missing_feature_docs: docs.missingFeatureDocs,
    tsconfig_strict: docs.tsconfigStrictFail,
    eslint_config_present: docs.eslintPresent
      ? []
      : ["No eslint.config.* / .eslintrc* found"],
    extreme_oversized_source_files: src.extreme,
    route_resolver_tests: routeTestFail,
    ci_knowledge_workflow: docs.ciKnowledge
      ? []
      : ["Missing .github/workflows/knowledge-check.yml"],
    feature_test_presence:
      featureTests.length > 0
        ? []
        : [
            "No feature-level *.test.* / *.spec.* under src/ (knowledge route tests alone do not count)",
          ],
    env_example_present: fs.existsSync(path.join(root, ".env.example"))
      ? []
      : [".env.example missing"],
    undocumented_env_vars: undocumented,
    mixed_architectural_responsibilities: src.mixedResponsibilities,
    excessive_module_surface: src.excessiveExports,
    cross_feature_deep_imports: src.deepCrossFeature,
    circular_dependencies: cycles,
    missing_public_api_entrypoints: docs.missingPublicApis,
    client_server_boundary: src.clientServer,
    next_public_secret_names: nextPublicSecrets,
    typecheck_pass: null,
    lint_pass: null,
    test_suite_pass: null,
  };

  const probeStatus = runProbeChecks(root, byCheck, withProbes);

  for (const key of ["typecheck_pass", "lint_pass", "test_suite_pass"]) {
    if (byCheck[key] === null) byCheck[key] = [NOT_EVALUATED];
  }

  return {
    collectedAt: new Date().toISOString(),
    withProbes,
    probeStatus,
    thresholds: {
      oversizedFileLines: lineLimit,
      staleDocDays: staleDays,
      excessiveExports: exportLimit,
      mixedLayerMin,
    },
    stats: {
      unownedCount: bundle.ownership.unowned.length,
      duplicateRouteCount: bundle.duplicateRoutes.length,
      oversizedCount: src.oversized.length,
      undocumentedEnvCount: undocumented.length,
      guardianHard: guardian.hard.length,
      guardianSoft: guardian.soft.length,
      featureTestFiles: featureTests.length,
      knowledgeTestFiles: pkTests.length,
      deepCrossFeatureCount: src.deepCrossFeature.length,
      cycleCount: cycles.length,
    },
    byCheck,
  };
}
