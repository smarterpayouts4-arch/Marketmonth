import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { EXCLUDE_DIR_NAMES } from "../scan/roots.mjs";

export function hashFile(absPath) {
  if (!fs.existsSync(absPath)) return null;
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(absPath))
    .digest("hex")
    .slice(0, 16);
}

function normalizePath(p) {
  return path.resolve(p).replace(/\\/g, "/").replace(/\/$/, "").toLowerCase();
}

/**
 * Resolve git provenance for MarketMonth.
 *
 * If `git rev-parse --show-toplevel` is outside MarketMonth (e.g. a parent
 * user folder that accidentally contains a .git), commit SHA is reported as
 * unavailable for this project — parent-repo SHAs must not be attributed here.
 */
export function gitProvenance(root) {
  const rootNorm = normalizePath(root);

  const toplevel = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: root,
    encoding: "utf8",
  });

  const toplevelOk =
    !toplevel.error &&
    typeof toplevel.status === "number" &&
    toplevel.status === 0;
  const gitRoot = toplevelOk ? normalizePath(toplevel.stdout.trim()) : null;

  const isProjectGitRoot = gitRoot !== null && gitRoot === rootNorm;
  const isNestedInParentGit =
    gitRoot !== null && rootNorm.startsWith(`${gitRoot}/`);

  if (!isProjectGitRoot) {
    return {
      commitSha: "unavailable",
      commitShort: "unavailable",
      workingTreeStatus: "unavailable",
      gitRoot: gitRoot || null,
      gitScope: isNestedInParentGit
        ? "parent-repo-outside-project"
        : "no-git-or-unreadable",
      note: isNestedInParentGit
        ? "MarketMonth is not its own git root; a parent directory owns .git. Commit SHA is intentionally unavailable until MarketMonth is a dedicated repository (or a documented monorepo package with an explicit root policy)."
        : "Could not resolve a git repository for MarketMonth.",
    };
  }

  const sha = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  const short = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  const dirty = spawnSync("git", ["status", "--porcelain"], {
    cwd: root,
    encoding: "utf8",
  });

  const commitAvailable =
    !sha.error && typeof sha.status === "number" && sha.status === 0;
  const dirtyAvailable =
    !dirty.error && typeof dirty.status === "number" && dirty.status === 0;

  return {
    commitSha: commitAvailable ? sha.stdout.trim() : "unavailable",
    commitShort: commitAvailable ? short.stdout.trim() : "unavailable",
    workingTreeStatus: !dirtyAvailable
      ? "unavailable"
      : dirty.stdout.trim()
        ? "dirty"
        : "clean",
    gitRoot,
    gitScope: "project-root",
    note: null,
  };
}

export function buildScoreProvenance(root, evidence, rules) {
  const git = gitProvenance(root);
  const rulesPath = path.join(root, "project-knowledge", "quality-rules.json");
  const probes = evidence.probeStatus || {};
  const skipped = [];
  const failed = [];
  const passed = [];
  const notEvaluated = [];

  for (const [name, info] of Object.entries(probes)) {
    const status = info?.status || "unknown";
    if (status === "skipped") skipped.push(name);
    else if (status === "fail") failed.push(name);
    else if (status === "pass") passed.push(name);
    else if (status === "pending") notEvaluated.push(name);
  }

  for (const r of evidence.officialNotEvaluatedRules || []) {
    if (!notEvaluated.includes(r)) notEvaluated.push(r);
  }

  return {
    scoreType: "Internal Engineering Quality Score",
    scoreAuthority: "MarketMonth internal rubric only — not external certification",
    rubricVersion: rules.rubricVersion || "unknown",
    rubricFile: "project-knowledge/quality-rules.json",
    rubricFileHash: hashFile(rulesPath),
    commitSha: git.commitSha,
    commitShort: git.commitShort,
    workingTreeStatus: git.workingTreeStatus,
    gitScope: git.gitScope,
    gitNote: git.note,
    commandsExecuted: [
      ...(evidence.withProbes
        ? ["npm run typecheck", "npm run lint", "npm test"]
        : []),
      "knowledge route resolver test",
      "guardian + ownership/env/structure collectors",
    ],
    probeStatus: probes,
    generatedFromRealExecution: Boolean(evidence.withProbes),
    skippedProbes: skipped,
    failedProbes: failed,
    passedProbes: passed,
    notEvaluatedProbes: notEvaluated,
    visibleIgnorePatterns: [...EXCLUDE_DIR_NAMES].sort(),
    aiAffectsOfficialScore: false,
  };
}
