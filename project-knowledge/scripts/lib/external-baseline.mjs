/**
 * External Baseline Coverage — separate from Internal Engineering Quality Score.
 * Counts executable/verified coverage of recognized engineering areas.
 * Never starts at 100% by default.
 */
import fs from "node:fs";
import path from "node:path";

/** @typedef {{ id: string, label: string, status: 'covered'|'partial'|'absent'|'na', evidence: string, recommended: 'now'|'later'|'na' }} BaselineArea */

/**
 * @param {string} root
 * @param {{ evidence: object, applied: object }} ctx
 */
function readTextIfExists(absPath) {
  try {
    return fs.existsSync(absPath) ? fs.readFileSync(absPath, "utf8") : "";
  } catch {
    return "";
  }
}

export function computeExternalBaseline(root, ctx) {
  const { evidence, applied } = ctx;
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8")
  );
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const scripts = pkg.scripts || {};
  const workflowPath = path.join(
    root,
    ".github",
    "workflows",
    "knowledge-check.yml"
  );
  const workflow = readTextIfExists(workflowPath);
  const hasAuditScript = typeof scripts["audit:deps"] === "string";
  const auditInCi =
    hasAuditScript &&
    (workflow.includes("audit:deps") || workflow.includes("npm audit"));
  const secretsInCi =
    /gitleaks/i.test(workflow) ||
    /trufflehog/i.test(workflow) ||
    /secretlint/i.test(workflow);
  const hasDependabot = fs.existsSync(
    path.join(root, ".github", "dependabot.yml")
  );

  /** @type {BaselineArea[]} */
  const areas = [];

  function add(id, label, status, evidenceText, recommended = "later") {
    areas.push({ id, label, status, evidence: evidenceText, recommended });
  }

  const probes = evidence.probeStatus || {};
  add(
    "typescript_strict_build",
    "TypeScript strictness and build integrity",
    probes.typecheck?.status === "pass" &&
      (evidence.byCheck?.tsconfig_strict || []).length === 0
      ? "covered"
      : probes.typecheck?.status === "pass"
        ? "partial"
        : "absent",
    `tsconfig strict check + npm run typecheck exit=${probes.typecheck?.exitCode ?? "n/a"}`,
    "now"
  );

  add(
    "eslint_static",
    "ESLint / static analysis",
    probes.lint?.status === "pass" ? "covered" : "partial",
    `eslint.config present; lint exit=${probes.lint?.exitCode ?? "n/a"}`,
    "now"
  );

  add(
    "automated_tests",
    "Automated testing with meaningful assertions",
    probes.test?.status === "pass" && (evidence.stats?.featureTestFiles || 0) > 0
      ? "covered"
      : "partial",
    `npm test + ${evidence.stats?.featureTestFiles || 0} feature test files under src/`,
    "now"
  );

  add(
    "coverage_tooling",
    "Coverage tooling",
    deps.c8 || deps.nyc || deps.vitest || deps["@vitest/coverage-v8"]
      ? "partial"
      : "absent",
    "No dedicated coverage gate in package scripts",
    "later"
  );

  add(
    "circular_deps",
    "Circular dependency detection",
    "partial",
    "In-repo import graph cycle detector (quality collector); not dependency-cruiser/madge",
    "later"
  );

  add(
    "dead_code",
    "Dead-code / unused-export analysis",
    deps.knip || deps["ts-prune"] ? "partial" : "absent",
    "No Knip/ts-prune wired into CI",
    "later"
  );

  add(
    "dep_vulnerability",
    "Dependency vulnerability scanning",
    auditInCi ? "covered" : hasAuditScript ? "partial" : "absent",
    auditInCi
      ? "npm run audit:deps (npm audit --audit-level=high) gated in knowledge-check CI"
      : hasAuditScript
        ? "audit:deps script exists but not confirmed in CI workflow"
        : "npm audit / OSV not gated in CI",
    "now"
  );

  add(
    "secret_scanning",
    "Secret scanning",
    secretsInCi ? "covered" : "absent",
    secretsInCi
      ? "Gitleaks (or equivalent) step in knowledge-check CI"
      : "No gitleaks/trufflehog/secretlint in CI",
    "now"
  );

  add(
    "owasp_sast",
    "OWASP-oriented / Semgrep / CodeQL",
    "absent",
    "No Semgrep or CodeQL workflow",
    "later"
  );

  add(
    "authz_boundaries",
    "Authentication and authorization boundaries",
    "partial",
    "Auth scaffold exists; CURRENT_STATE marks production auth gates incomplete — not fully verified by automated matrix",
    "now"
  );

  add(
    "env_handling",
    "Secure environment-variable handling",
    (evidence.byCheck?.undocumented_env_vars || []).length === 0 &&
      (evidence.byCheck?.next_public_secret_names || []).length === 0
      ? "covered"
      : "partial",
    ".env.example + undocumented/NEXT_PUBLIC secret-name checks in rubric",
    "now"
  );

  add(
    "accessibility",
    "Accessibility testing",
    "absent",
    "No axe/pa11y/Playwright a11y gate",
    "later"
  );

  add(
    "performance_budget",
    "Performance / bundle-size budgets",
    "absent",
    "No Lighthouse CI or bundle analyzer budget",
    "later"
  );

  add(
    "api_contracts",
    "API contract validation",
    "partial",
    "Zod schemas for discovery requests/events; no OpenAPI contract suite",
    "later"
  );

  add(
    "db_migrations",
    "Database migration discipline",
    fs.existsSync(path.join(root, "drizzle.config.ts")) ||
      fs.existsSync(path.join(root, "drizzle.config.js"))
      ? "partial"
      : "absent",
    "Drizzle present; no automated migration-drift gate in quality closeout",
    "later"
  );

  add(
    "resilience",
    "Error handling and resilience",
    "partial",
    "Feature tests cover validation failures; no chaos/resilience suite",
    "later"
  );

  add(
    "observability",
    "Logging and observability",
    "absent",
    "CURRENT_STATE lists production observability as missing",
    "now"
  );

  add(
    "ci_gates",
    "CI quality gates",
    fs.existsSync(workflowPath) ? "covered" : "absent",
    "CI runs audit:deps, secret scan, typecheck, lint, test, knowledge:check, quality:check",
    "now"
  );

  add(
    "supply_chain",
    "Supply-chain / dependency integrity",
    hasDependabot ? "partial" : "absent",
    hasDependabot
      ? "Dependabot for npm + GitHub Actions (weekly); no SBOM/attestation gate yet"
      : "No Dependabot / lockfile attestation / SBOM gate",
    "later"
  );

  add(
    "docs_ownership",
    "Documentation and ownership",
    applied.evaluationsComplete &&
      (evidence.byCheck?.unowned_src_paths || []).length === 0
      ? "covered"
      : "partial",
    "ownership-rules.json + CURRENT_STATE freshness + FEATURES docs checks",
    "now"
  );

  add(
    "arch_enforcement",
    "Architectural dependency enforcement",
    (evidence.stats?.guardianHard || 0) === 0 ? "covered" : "absent",
    "Guardian + quality independence rules (UI/engine/db, public APIs)",
    "now"
  );

  const relevant = areas.filter((a) => a.status !== "na");
  const coveredWeight = relevant.reduce(
    (s, a) => s + (a.status === "covered" ? 1 : a.status === "partial" ? 0.5 : 0),
    0
  );
  const pct = Math.round((coveredWeight / relevant.length) * 100);

  return {
    schemaVersion: 1,
    label: "External Baseline Coverage",
    coveragePercent: pct,
    externalValidationStatus:
      pct >= 90 ? "Strong" : pct >= 60 ? "Partial" : "Limited",
    externalCertification: "None",
    areas,
    note: "This is coverage of recognized engineering practices with executable evidence — not a certification and not merged into the Internal Engineering Quality Score.",
  };
}
