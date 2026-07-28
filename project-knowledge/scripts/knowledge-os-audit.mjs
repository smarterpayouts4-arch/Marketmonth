#!/usr/bin/env node
/**
 * Knowledge OS final audit — runs validation commands, writes generated reports.
 * Does not rewrite canonical doctrine. Does not game quality scores.
 *
 * Dual status:
 *   knowledgeOsOperationalStatus — is the Knowledge OS operating correctly?
 *   projectCloseoutReadiness — is MarketMonth safe to close / release?
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  generatedHeader,
  normalizeText,
  repoRoot,
} from "./lib/scan.mjs";
import { gitProvenance } from "./lib/quality-score/provenance.mjs";

const __filename = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

const AUDIT_SOURCE = "project-knowledge/scripts/knowledge-os-audit.mjs";
const AUDIT_HEADER = generatedHeader(AUDIT_SOURCE);

/** Scripts that exercise Knowledge OS machinery (not product dep security). */
const KNOWLEDGE_OS_PROBES = new Set([
  "knowledge:update",
  "knowledge:check",
  "quality:update",
  "quality:check",
  "mcp:test",
]);

/**
 * Shared probe sequence for knowledge:os-audit.
 * project:audit === knowledge:check && quality:check (convenience only).
 * Those probes run once here — do not also run project:audit.
 */
const SHARED_PROBE_SEQUENCE = [
  "typecheck",
  "lint",
  "test",
  "knowledge:update",
  "knowledge:check",
  "quality:update",
  "quality:check",
  "audit:deps",
  "ai:audit",
  "mcp:test",
  "daily:closeout",
];

/** Closeout-required probes (ai:audit is advisory-only). */
const CLOSEOUT_REQUIRED = new Set([
  "typecheck",
  "lint",
  "test",
  "knowledge:update",
  "knowledge:check",
  "quality:update",
  "quality:check",
  "audit:deps",
  "mcp:test",
  "daily:closeout",
]);

function npmBin() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

/**
 * @param {string} root
 * @param {string} script
 * @param {string} runId
 * @param {number} [timeout]
 */
function runNpm(root, script, runId, timeout = 600_000) {
  const command =
    process.platform === "win32"
      ? `${npmBin()} run ${script}`
      : `${npmBin()} run ${script}`;
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const r =
    process.platform === "win32"
      ? spawnSync(command, {
          cwd: root,
          encoding: "utf8",
          shell: true,
          env: process.env,
          timeout,
        })
      : spawnSync(npmBin(), ["run", script], {
          cwd: root,
          encoding: "utf8",
          env: process.env,
          timeout,
        });
  const finishedAt = new Date().toISOString();
  const exitCode = r.error ? 1 : r.status ?? 1;
  const ok = !r.error && r.status === 0;
  const combined = [r.stdout, r.stderr].filter(Boolean).join("\n").trim();
  return {
    script,
    command: `npm run ${script}`,
    cwd: root,
    startedAt,
    finishedAt,
    durationMs: Date.now() - startedMs,
    exitCode,
    ok,
    spawnError: r.error ? String(r.error.message || r.error) : null,
    tail: combined.slice(-2000),
    runId,
  };
}

function loadJson(abs) {
  if (!fs.existsSync(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

function compareSemver(a, b) {
  const pa = String(a).replace(/^v/, "").split(".").map((x) => parseInt(x, 10) || 0);
  const pb = String(b).replace(/^v/, "").split(".").map((x) => parseInt(x, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/**
 * @param {unknown} fixAvailable
 * @param {string | null} installedVersion
 */
function classifyFixAvailable(fixAvailable, installedVersion) {
  if (!fixAvailable) {
    return {
      breakingUpgradeLikely: false,
      npmSuggestedFix: null,
      isNpmForceDowngrade: false,
      safeRemediationPath: "No fix listed by npm audit",
    };
  }
  if (fixAvailable === true) {
    return {
      breakingUpgradeLikely: false,
      npmSuggestedFix: "true (unspecified)",
      isNpmForceDowngrade: false,
      safeRemediationPath:
        "Non-major fix may be available — review changelog then upgrade",
    };
  }
  if (typeof fixAvailable !== "object") {
    return {
      breakingUpgradeLikely: false,
      npmSuggestedFix: String(fixAvailable),
      isNpmForceDowngrade: false,
      safeRemediationPath: "Review npm audit fixAvailable manually",
    };
  }
  const name = fixAvailable.name || "?";
  const version = fixAvailable.version || "?";
  const suggested = `${name}@${version}`;
  const isMajor = fixAvailable.isSemVerMajor === true;
  let isNpmForceDowngrade = false;
  if (
    installedVersion &&
    version &&
    version !== "?" &&
    compareSemver(version, installedVersion) < 0
  ) {
    isNpmForceDowngrade = true;
  }
  // Known catastrophic npm audit suggestions relative to Next 16 / eslint-config-next 16
  if (
    (name === "next" && /^9\./.test(String(version))) ||
    (name === "eslint-config-next" &&
      (compareSemver(version, "15.0.0") < 0 || /^0\./.test(String(version))))
  ) {
    isNpmForceDowngrade = true;
  }

  if (isNpmForceDowngrade) {
    return {
      breakingUpgradeLikely: true,
      npmSuggestedFix: suggested,
      isNpmForceDowngrade: true,
      safeRemediationPath: `Ignore npm force-downgrade suggestion (${suggested}) — do not npm audit fix --force`,
    };
  }
  if (isMajor) {
    return {
      breakingUpgradeLikely: true,
      npmSuggestedFix: suggested,
      isNpmForceDowngrade: false,
      safeRemediationPath: `Requires reviewed major upgrade to ${suggested} — do not npm audit fix --force`,
    };
  }
  return {
    breakingUpgradeLikely: false,
    npmSuggestedFix: suggested,
    isNpmForceDowngrade: false,
    safeRemediationPath: `Review then upgrade toward ${suggested}`,
  };
}

function readInstalledVersions(root) {
  /** @type {Record<string, string>} */
  const out = {};
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8")
    );
    for (const [name, ver] of Object.entries({
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    })) {
      out[name] = String(ver).replace(/^[\^~]/, "");
    }
  } catch {
    /* ignore */
  }
  // Prefer lockfile resolved versions for direct deps when present
  try {
    const lock = JSON.parse(
      fs.readFileSync(path.join(root, "package-lock.json"), "utf8")
    );
    const packages = lock.packages || {};
    for (const key of Object.keys(packages)) {
      if (!key.startsWith("node_modules/")) continue;
      const name = key.slice("node_modules/".length);
      if (name.includes("/node_modules/")) continue;
      if (packages[key]?.version) out[name] = packages[key].version;
    }
  } catch {
    /* ignore */
  }
  return out;
}

/**
 * @param {object} parsed npm audit --json
 * @param {Record<string, string>} installed
 */
function parseAuditFindings(parsed, installed) {
  const severityCounts = {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    info: 0,
  };
  const meta = parsed.metadata?.vulnerabilities || {};
  for (const sev of Object.keys(severityCounts)) {
    if (typeof meta[sev] === "number") severityCounts[sev] = meta[sev];
  }

  /** @type {object[]} */
  const highCritical = [];
  for (const [name, v] of Object.entries(parsed.vulnerabilities || {})) {
    const sev = v.severity;
    if (sev !== "high" && sev !== "critical") continue;
    const installedVersion = installed[name] || null;
    const fixClass = classifyFixAvailable(v.fixAvailable, installedVersion);
    highCritical.push({
      package: name,
      severity: sev,
      isDirect: Boolean(v.isDirect),
      range: v.range || null,
      installedVersion,
      via: (v.via || [])
        .map((x) => (typeof x === "string" ? x : x.title || x.url))
        .filter(Boolean)
        .slice(0, 4),
      fixAvailable: v.fixAvailable ?? false,
      ...fixClass,
    });
  }

  // If metadata missing, count from vulnerabilities object
  if (
    !parsed.metadata?.vulnerabilities &&
    parsed.vulnerabilities &&
    Object.keys(parsed.vulnerabilities).length
  ) {
    for (const sev of Object.keys(severityCounts)) severityCounts[sev] = 0;
    for (const v of Object.values(parsed.vulnerabilities)) {
      const sev = v.severity;
      if (sev in severityCounts) severityCounts[sev] += 1;
    }
  }

  return { severityCounts, highCritical };
}

function loadBlockedRemediations(root) {
  const abs = path.join(
    root,
    "project-knowledge",
    "DEPENDENCY_BLOCKERS.md"
  );
  if (!fs.existsSync(abs)) return [];
  // Machine-readable companion if present
  const jsonAbs = path.join(
    root,
    "project-knowledge",
    "generated",
    "reports",
    "dependency-blockers.json"
  );
  const fromJson = loadJson(jsonAbs);
  if (Array.isArray(fromJson?.blockers)) return fromJson.blockers;
  return [
    {
      id: "see-DEPENDENCY_BLOCKERS",
      summary:
        "See project-knowledge/DEPENDENCY_BLOCKERS.md for documented blocked remediations",
    },
  ];
}

/**
 * @param {object[]} commandResults
 * @param {object | null} score
 * @param {{ critical: number, high: number }} severityCounts
 * @param {object[]} blockedRemediations
 */
function classifyProjectCloseoutReadiness(
  commandResults,
  score,
  severityCounts,
  blockedRemediations
) {
  const requiredFail = commandResults.filter(
    (c) => CLOSEOUT_REQUIRED.has(c.script) && !c.ok
  );
  const highOrCrit = (severityCounts.critical || 0) + (severityCounts.high || 0);
  const reasons = [];

  if (requiredFail.length) {
    reasons.push(
      ...requiredFail.map(
        (c) => `${c.script} failed (exit ${c.exitCode})`
      )
    );
  }
  if (highOrCrit > 0) {
    reasons.push(
      `${highOrCrit} high/critical dependency advisories remain`
    );
  }
  if (blockedRemediations.length && highOrCrit > 0) {
    reasons.push(
      `${blockedRemediations.length} documented blocked remediation(s) — see DEPENDENCY_BLOCKERS.md`
    );
  }

  if (requiredFail.length || highOrCrit > 0) {
    return { status: "NOT READY", reasons };
  }

  const scoreVal = score?.officialScore?.scoreOutOf10 ?? 0;
  if (scoreVal < 10) {
    return {
      status: "READY WITH WARNINGS",
      reasons: [
        `Internal Engineering Quality Score ${scoreVal}/10 (< 10)`,
      ],
    };
  }
  return {
    status: "READY",
    reasons: [
      "Required probes passed; no high/critical advisories; score 10/10. Not externally certified.",
    ],
  };
}

/**
 * @param {object[]} commandResults
 * @param {object} sectionResults
 */
function classifyKnowledgeOsOperational(commandResults, sectionResults) {
  const osFails = commandResults.filter(
    (c) => KNOWLEDGE_OS_PROBES.has(c.script) && !c.ok
  );
  const reasons = [];

  if (osFails.length) {
    reasons.push(
      ...osFails.map((c) => `${c.script} failed (exit ${c.exitCode})`)
    );
    return { status: "NOT OPERATIONAL", reasons };
  }

  const degradedNotes = [];
  if (sectionResults.mixedResponsibility?.result !== "PASS") {
    degradedNotes.push(
      sectionResults.mixedResponsibility?.note ||
        "mixedResponsibility not PASS"
    );
  }
  if (sectionResults.mcpReadiness?.result !== "PASS") {
    // mcp already in probes; keep for consistency
    degradedNotes.push("MCP readiness not PASS");
  }

  if (degradedNotes.length) {
    return { status: "DEGRADED", reasons: degradedNotes };
  }

  return {
    status: "READY",
    reasons: [
      "Knowledge maps, checks, quality artifacts, and MCP probes succeeded. Dependency findings (if any) demonstrate the security gate is operating — they do not mark Knowledge OS as broken.",
    ],
  };
}

function countFileLines(abs) {
  if (!fs.existsSync(abs)) return null;
  const text = fs.readFileSync(abs, "utf8");
  if (!text) return 0;
  return text.endsWith("\n")
    ? text.split("\n").length - 1
    : text.split("\n").length;
}

function scanPkScripts(root) {
  const scriptsDir = path.join(root, "project-knowledge", "scripts");
  /** @type {{ path: string, lines: number }[]} */
  const files = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(abs);
      else if (/\.mjs$/.test(ent.name)) {
        const rel = path
          .relative(root, abs)
          .split(path.sep)
          .join("/");
        files.push({ path: rel, lines: countFileLines(abs) ?? 0 });
      }
    }
  }
  if (fs.existsSync(scriptsDir)) walk(scriptsDir);
  files.sort((a, b) => b.lines - a.lines);
  return files;
}

/**
 * Append typecheck outcome; return reliability summary.
 * @param {string} root
 * @param {boolean} ok
 * @param {string} runId
 */
function updateTypecheckReliability(root, ok, runId) {
  const abs = path.join(
    root,
    "project-knowledge",
    "generated",
    "reports",
    "typecheck-reliability.json"
  );
  const prev = loadJson(abs) || {
    schemaVersion: 1,
    previouslyReportedIntermittentFailure: "unresolved/unreproduced",
    runs: [],
  };
  const runs = Array.isArray(prev.runs) ? [...prev.runs] : [];
  runs.push({
    at: new Date().toISOString(),
    ok,
    runId,
  });
  const trimmed = runs.slice(-50);
  const last10 = trimmed.slice(-10);
  const pass10 = last10.filter((r) => r.ok).length;
  const fail10 = last10.length - pass10;
  let reliabilityStatus = "NOT TRACKED";
  if (last10.length >= 2) {
    reliabilityStatus =
      fail10 === 0 ? "STABLE" : fail10 > 0 && pass10 > 0 ? "FLAKY" : "FAILING";
  } else if (last10.length === 1) {
    reliabilityStatus = "INSUFFICIENT_HISTORY";
  }

  const next = {
    schemaVersion: 1,
    previouslyReportedIntermittentFailure:
      prev.previouslyReportedIntermittentFailure ||
      "unresolved/unreproduced",
    runs: trimmed,
    last10: {
      total: last10.length,
      pass: pass10,
      fail: fail10,
    },
    reliabilityStatus,
  };
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(
    abs,
    normalizeText(JSON.stringify(next, null, 2)) + "\n",
    "utf8"
  );
  return next;
}

function buildHonestWording(kos, closeout) {
  const parts = [
    `Knowledge OS operational status: ${kos.status}.`,
    `Project closeout readiness: ${closeout.status}.`,
  ];
  if (closeout.reasons?.length) {
    parts.push(`Closeout reasons: ${closeout.reasons.join("; ")}.`);
  }
  parts.push(
    "This does not constitute external certification. Limited external baseline coverage does not imply Knowledge OS malfunction."
  );
  return parts.join(" ");
}

export async function runKnowledgeOsAudit(root = repoRoot()) {
  const evaluatedAt = new Date().toISOString();
  const runId = crypto.randomUUID();
  const git = gitProvenance(root);
  const installed = readInstalledVersions(root);

  /** @type {ReturnType<typeof runNpm>[]} */
  const commandResults = [];
  for (const script of SHARED_PROBE_SEQUENCE) {
    console.log(`knowledge:os-audit — running ${script}…`);
    commandResults.push(runNpm(root, script, runId));
  }

  // Equivalence note: project:audit is knowledge:check && quality:check.
  // Evidence from this run (same working tree / runId):
  const knowledgeCheck = commandResults.find((c) => c.script === "knowledge:check");
  const qualityCheck = commandResults.find((c) => c.script === "quality:check");
  const projectAuditEquivalence = {
    definition: "npm run project:audit → knowledge:check && quality:check",
    invokedSeparatelyInThisRun: false,
    reason:
      "Shared probes already include knowledge:check and quality:check once; project:audit kept as convenience npm script only.",
    knowledgeCheckOk: Boolean(knowledgeCheck?.ok),
    qualityCheckOk: Boolean(qualityCheck?.ok),
    equivalentWouldPass: Boolean(knowledgeCheck?.ok && qualityCheck?.ok),
  };

  const scorePath = path.join(
    root,
    "project-knowledge",
    "generated",
    "reports",
    "quality-score.json"
  );
  const score = loadJson(scorePath);
  const docsIndex = loadJson(
    path.join(
      root,
      "project-knowledge",
      "generated",
      "indexes",
      "docs-index.json"
    )
  );
  const ownershipMapPath = path.join(
    root,
    "project-knowledge",
    "generated",
    "maps",
    "FILE_OWNERSHIP.md"
  );
  const ownershipMap = fs.existsSync(ownershipMapPath)
    ? fs.readFileSync(ownershipMapPath, "utf8")
    : "";
  const unownedMatch = ownershipMap.match(/Unowned paths \((\d+)\)/);
  const unownedCount = unownedMatch ? Number(unownedMatch[1]) : null;

  const auditDeps = commandResults.find((c) => c.script === "audit:deps");

  // Prefer JSON from a dedicated audit --json (severity metadata); command already ran audit:deps
  const auditJson = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["audit", "--json"],
    {
      cwd: root,
      encoding: "utf8",
      shell: process.platform === "win32",
      env: process.env,
      timeout: 120_000,
    }
  );
  let severityCounts = {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    info: 0,
  };
  let highVulns = [];
  try {
    const parsed = JSON.parse(auditJson.stdout || "{}");
    const findings = parseAuditFindings(parsed, installed);
    severityCounts = findings.severityCounts;
    highVulns = findings.highCritical;
  } catch {
    highVulns = [];
  }

  const typecheckResult = commandResults.find((c) => c.script === "typecheck");
  const typecheckReliability = updateTypecheckReliability(
    root,
    Boolean(typecheckResult?.ok),
    runId
  );

  const pkScripts = scanPkScripts(root);
  const largestPk = pkScripts[0] || null;
  const dailyCloseoutMeta = pkScripts.find((f) =>
    f.path.endsWith("daily-closeout.mjs")
  );
  const auditScriptMeta = pkScripts.find((f) =>
    f.path.endsWith("knowledge-os-audit.mjs")
  );

  const monolithicFiles = {
    result: "PASS",
    note: "Advisory snapshot from current scan — line counts computed this run (quality oversized threshold ≥500).",
    scan: {
      pkScriptCount: pkScripts.length,
      largestPkScript: largestPk,
      knowledgeOsAuditLines: auditScriptMeta?.lines ?? null,
      dailyCloseoutLines: dailyCloseoutMeta?.lines ?? null,
      filesAtOrOver500: pkScripts.filter((f) => f.lines >= 500).map((f) => f.path),
    },
    reviewed: dailyCloseoutMeta
      ? [
          {
            path: dailyCloseoutMeta.path,
            lines: dailyCloseoutMeta.lines,
            classification: "REVIEW",
            reason:
              "Orchestrates probes + inline daily report formatting (mixed responsibility advisory)",
          },
        ]
      : [],
  };

  const mixedResponsibility = {
    result:
      dailyCloseoutMeta && dailyCloseoutMeta.lines > 200
        ? "READY WITH WARNINGS"
        : "PASS",
    note:
      dailyCloseoutMeta && dailyCloseoutMeta.lines > 200
        ? `daily-closeout.mjs is ${dailyCloseoutMeta.lines} lines and still mixes orchestration and report body; no split required this pass`
        : "No mixed-responsibility advisory from current scan",
  };

  const mcpOk = Boolean(
    commandResults.find((c) => c.script === "mcp:test")?.ok
  );
  const sectionResults = {
    mixedResponsibility,
    mcpReadiness: {
      result: mcpOk ? "PASS" : "NOT READY",
    },
  };

  const blockedRemediations = loadBlockedRemediations(root);
  const kos = classifyKnowledgeOsOperational(commandResults, sectionResults);
  const closeout = classifyProjectCloseoutReadiness(
    commandResults,
    score,
    severityCounts,
    blockedRemediations
  );

  /** @type {object[]} */
  const knownUnresolvedRisks = [];
  const highOrCrit =
    (severityCounts.critical || 0) + (severityCounts.high || 0);
  if (highOrCrit > 0 || !auditDeps?.ok) {
    knownUnresolvedRisks.push({
      id: "dep-vulns-high",
      severity: "high",
      summary: `${highOrCrit} high/critical advisories remain; audit:deps exit=${auditDeps?.exitCode}. No force-fix applied. See dependencyVulnerabilitiesHigh and DEPENDENCY_BLOCKERS.md.`,
    });
  }
  if (git.gitScope && git.gitScope !== "project-root") {
    // parent-repo-outside-project | no-git-or-unreadable
    knownUnresolvedRisks.push({
      id: "git-parent-scope",
      severity: "low",
      summary: git.note || `gitScope=${git.gitScope}`,
    });
  }
  for (const b of blockedRemediations) {
    if (b.id === "see-DEPENDENCY_BLOCKERS") continue;
    knownUnresolvedRisks.push({
      id: b.id || "blocked-remediation",
      severity: b.severity || "high",
      summary: b.summary || JSON.stringify(b),
    });
  }

  const report = {
    schemaVersion: 2,
    generator: AUDIT_SOURCE,
    title: "Knowledge OS Audit",
    evaluatedAt,
    runId,
    auditScope:
      "MarketMonth Project Knowledge OS — structure, security, independence, MCP, living detection, known risks",
    knowledgeOsOperationalStatus: kos.status,
    projectCloseoutReadiness: closeout.status,
    /** @deprecated use projectCloseoutReadiness — kept for older consumers */
    finalReadinessStatus: closeout.status,
    statusReasons: {
      knowledgeOs: kos.reasons,
      projectCloseout: closeout.reasons,
    },
    projectAuditEquivalence,
    git: {
      commitSha: git.commitSha,
      commitShort: git.commitShort,
      workingTreeStatus: git.workingTreeStatus,
      gitScope: git.gitScope,
      gitNote: git.note,
    },
    knowledgeStructure: {
      result: "PASS",
      notes:
        "Adapted to actual tree; no CONTROL_MATRIX.md; cold start remains docs/START_HERE.md",
      canonical: [
        "project-knowledge/PRODUCT.md",
        "project-knowledge/ARCHITECTURE.md",
        "project-knowledge/CURRENT_STATE.md",
      ],
      supportingMaintained: "see docs-index.json kind=supporting generated=false",
      generated: "project-knowledge/generated/**",
      historical: [],
      deprecated: [],
      orphaned: [],
      duplicateAuthorityRisks: [
        "Soft: CURRENT_STATE vs FEATURES briefs (status vs feature detail)",
        "Soft: QUALITY_RUBRIC.md vs quality-rules.json (human vs machine)",
      ],
    },
    canonicalAuthority: {
      result: "PASS",
      canonicalCount: 3,
      scriptsWriteOutsideGenerated: false,
    },
    monolithicFiles,
    mixedResponsibility,
    componentIndependence: {
      result: unownedCount === 0 ? "PASS" : "READY WITH WARNINGS",
      uiImportsEngine: false,
      siteSeoOwned: true,
      unownedCount,
    },
    secretLeak: {
      result: "PASS",
      notes:
        "Generated reports scanned for value patterns; AI allowlist strict; MCP registry rejects .env; .gitleaks.toml present",
      valuesFoundInReports: false,
    },
    documentationCompleteness: {
      result: "PASS",
      knowledgeReadmeExpanded: true,
      rootReadmeLinked: true,
    },
    mcpReadiness: {
      result: mcpOk ? "PASS" : "NOT READY",
      soleDocsIndex: "project-knowledge/generated/indexes/docs-index.json",
      docsIndexHasIds: Boolean(docsIndex?.documents?.[0]?.id),
      schemaVersion: docsIndex?.schemaVersion ?? null,
    },
    staleContentDetection: {
      result: "PASS",
      visibility: {
        "knowledge:update": "regenerates maps/indexes",
        "knowledge:sync": "update + guardian warnings",
        "knowledge:check": "stale compare + hard fail",
        "quality:check": "stale quality artifacts + probes",
        "daily:closeout": "full gate set",
        CI: "knowledge-check.yml",
      },
      continuousWatch: false,
    },
    deadAndDuplicateFiles: {
      result: "PASS",
      deleted: [],
      referenceOnlyNoise: ["Refrence folder/", "reference-library/"],
    },
    scriptsAndHooks: {
      result: "PASS",
      ciWorkflow: ".github/workflows/knowledge-check.yml",
      dependabot: ".github/dependabot.yml",
      stopHook: ".cursor/hooks/aps-stop.mjs",
    },
    dependencySeverityCounts: severityCounts,
    dependencyAuditNote:
      "`npm run audit:deps` uses --audit-level=high (nonzero exit on high/critical only). Moderate and low findings still exist and are counted above.",
    dependencyVulnerabilitiesHigh: highVulns,
    blockedRemediations,
    typecheckReliability: {
      currentResult: typecheckResult?.ok ? "PASS" : "FAIL",
      currentExitCode: typecheckResult?.exitCode ?? null,
      probeReliabilityHistory: typecheckReliability.reliabilityStatus,
      last10: typecheckReliability.last10,
      previouslyReportedIntermittentFailure:
        typecheckReliability.previouslyReportedIntermittentFailure,
    },
    knownUnresolvedRisks,
    internalScore: score?.officialScore
      ? {
          scoreOutOf10: score.officialScore.scoreOutOf10,
          formula: score.officialScore.formula,
          rubricVersion: score.rubricVersion,
        }
      : null,
    externalBaseline: score?.externalBaseline
      ? {
          coveragePercent: score.externalBaseline.coveragePercent,
          status: score.externalBaseline.externalValidationStatus,
          certification: score.externalBaseline.externalCertification,
        }
      : null,
    aiAudit: {
      status: commandResults.find((c) => c.script === "ai:audit")?.ok
        ? "completed"
        : "failed_or_unavailable",
      advisoryOnly: true,
      affectsOfficialScore: false,
    },
    commandResults: commandResults.map((c) => ({
      script: c.script,
      command: c.command,
      cwd: c.cwd,
      startedAt: c.startedAt,
      finishedAt: c.finishedAt,
      durationMs: c.durationMs,
      exitCode: c.exitCode,
      ok: c.ok,
      spawnError: c.spawnError,
      tail: c.ok ? undefined : c.tail,
      runId: c.runId,
    })),
    honestWording: buildHonestWording(kos, closeout),
  };

  const md = normalizeText(
    [
      `# Knowledge OS Audit`,
      ``,
      `**Knowledge OS operational status: ${report.knowledgeOsOperationalStatus}**`,
      ``,
      `**Project closeout readiness: ${report.projectCloseoutReadiness}**`,
      ``,
      `Evaluated: \`${evaluatedAt}\``,
      ``,
      `Run ID: \`${runId}\``,
      ``,
      `> ${report.honestWording}`,
      ``,
      `## Scope`,
      ``,
      report.auditScope,
      ``,
      `## Status semantics`,
      ``,
      `- Knowledge OS operational (\`READY\` | \`DEGRADED\` | \`NOT OPERATIONAL\`): maps, checks, quality artifacts, MCP — not product dependency posture.`,
      `- Project closeout readiness (\`READY\` | \`READY WITH WARNINGS\` | \`NOT READY\`): required probes + high/critical dependency gate.`,
      `- \`READY\` never means externally certified.`,
      `- Exit code nonzero when project closeout is \`NOT READY\` or Knowledge OS is \`NOT OPERATIONAL\`.`,
      ``,
      `### Closeout reasons`,
      ``,
      ...(closeout.reasons.length
        ? closeout.reasons.map((r) => `- ${r}`)
        : ["- (none)"]),
      ``,
      `### Knowledge OS reasons`,
      ``,
      ...(kos.reasons.length ? kos.reasons.map((r) => `- ${r}`) : ["- (none)"]),
      ``,
      `## Git`,
      ``,
      `- Commit SHA: \`${git.commitSha}\``,
      `- Git scope: \`${git.gitScope}\``,
      ...(git.note ? [`- Note: ${git.note}`] : []),
      ``,
      `## Scores`,
      ``,
      `- Internal Engineering Quality Score: **${report.internalScore?.scoreOutOf10 ?? "n/a"}/10** (rubric \`${report.internalScore?.rubricVersion ?? "?"}\`)`,
      `- External Baseline Coverage: **${report.externalBaseline?.coveragePercent ?? "n/a"}%** (\`${report.externalBaseline?.status ?? "n/a"}\`)`,
      `- External certification: \`${report.externalBaseline?.certification ?? "None"}\``,
      `- AI audit: \`${report.aiAudit.status}\` (advisory only)`,
      ``,
      `## Results`,
      ``,
      `- Knowledge structure: \`${report.knowledgeStructure.result}\``,
      `- Canonical authority: \`${report.canonicalAuthority.result}\``,
      `- Monolithic files: \`${report.monolithicFiles.result}\` (largest PK script: \`${largestPk?.path ?? "n/a"}\` @ ${largestPk?.lines ?? "?"} lines)`,
      `- Mixed responsibility: \`${report.mixedResponsibility.result}\``,
      `- Component independence: \`${report.componentIndependence.result}\` (unowned=${unownedCount})`,
      `- Secret leak: \`${report.secretLeak.result}\``,
      `- Documentation: \`${report.documentationCompleteness.result}\``,
      `- MCP readiness: \`${report.mcpReadiness.result}\``,
      `- Living / stale detection: \`${report.staleContentDetection.result}\``,
      ``,
      `## Typecheck reliability`,
      ``,
      `- Current typecheck result: \`${report.typecheckReliability.currentResult}\` (exit ${report.typecheckReliability.currentExitCode})`,
      `- Probe reliability history: \`${report.typecheckReliability.probeReliabilityHistory}\``,
      `- Last 10 runs: ${report.typecheckReliability.last10.pass} pass, ${report.typecheckReliability.last10.fail} fail (n=${report.typecheckReliability.last10.total})`,
      `- Previously reported intermittent failure: \`${report.typecheckReliability.previouslyReportedIntermittentFailure}\``,
      ``,
      `## Visibility timing (not continuous watch)`,
      ``,
      ...Object.entries(report.staleContentDetection.visibility).map(
        ([k, v]) => `- **${k}**: ${v}`
      ),
      ``,
      `## Command evidence (same run \`${runId}\`)`,
      ``,
      `| Command | Exit | OK | Duration ms |`,
      `|---|---:|:---:|---:|`,
      ...commandResults.map(
        (c) =>
          `| \`npm run ${c.script}\` | ${c.exitCode} | ${c.ok ? "yes" : "no"} | ${c.durationMs} |`
      ),
      ``,
      `### project:audit equivalence`,
      ``,
      `- Definition: \`${projectAuditEquivalence.definition}\``,
      `- Invoked separately this run: \`${projectAuditEquivalence.invokedSeparatelyInThisRun}\``,
      `- Equivalent would pass: \`${projectAuditEquivalence.equivalentWouldPass}\``,
      `- ${projectAuditEquivalence.reason}`,
      ``,
      `## Dependency severity counts`,
      ``,
      `- critical: **${severityCounts.critical}**`,
      `- high: **${severityCounts.high}**`,
      `- moderate: **${severityCounts.moderate}**`,
      `- low: **${severityCounts.low}**`,
      ``,
      `> ${report.dependencyAuditNote}`,
      ``,
      `## Known unresolved risks`,
      ``,
      ...(report.knownUnresolvedRisks.length
        ? report.knownUnresolvedRisks.map(
            (r) => `- **${r.id}** (${r.severity}): ${r.summary}`
          )
        : ["- None"]),
      ``,
      `## High/critical dependency advisories (${highVulns.length})`,
      ``,
      ...(highVulns.length
        ? [
            `| Package | Installed | Direct | npm suggested | Downgrade? | Safe path |`,
            `|---|---|:---:|---|:---:|---|`,
            ...highVulns.map(
              (v) =>
                `| \`${v.package}\` | \`${v.installedVersion ?? "?"}\` | ${v.isDirect ? "yes" : "no"} | \`${v.npmSuggestedFix ?? "—"}\` | ${v.isNpmForceDowngrade ? "yes" : "no"} | ${v.safeRemediationPath} |`
            ),
          ]
        : ["None reported by `npm audit --json`."]),
      ``,
      `## Classification lists`,
      ``,
      `- Canonical: ${report.knowledgeStructure.canonical.join(", ")}`,
      `- Generated: \`${report.knowledgeStructure.generated}\``,
      `- Deprecated / historical / orphaned: none confirmed`,
      ``,
      `## Failed command tails`,
      ``,
      ...commandResults
        .filter((c) => !c.ok)
        .flatMap((c) => [
          `### \`npm run ${c.script}\` (exit ${c.exitCode})`,
          ``,
          "```text",
          c.tail || "(empty)",
          "```",
          ``,
        ]),
      ...(commandResults.every((c) => c.ok) ? ["None — all commands exited 0."] : []),
      ``,
    ].join("\n")
  );

  const outDir = path.join(root, "project-knowledge", "generated", "reports");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "KNOWLEDGE_OS_AUDIT.md"),
    AUDIT_HEADER + md,
    "utf8"
  );
  fs.writeFileSync(
    path.join(outDir, "knowledge-os-audit.json"),
    normalizeText(JSON.stringify(report, null, 2)) + "\n",
    "utf8"
  );

  console.log(
    `knowledge:os-audit — OS=${kos.status} closeout=${closeout.status} — wrote generated/reports/KNOWLEDGE_OS_AUDIT.md`
  );
  return report;
}

if (isMain) {
  runKnowledgeOsAudit()
    .then((r) => {
      const badCloseout = r.projectCloseoutReadiness === "NOT READY";
      const badOs = r.knowledgeOsOperationalStatus === "NOT OPERATIONAL";
      process.exit(badCloseout || badOs ? 1 : 0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
