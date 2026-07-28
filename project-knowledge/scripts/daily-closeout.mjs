#!/usr/bin/env node
/**
 * Daily project closeout — blocking deterministic gates + advisory AI audit.
 *
 * STATUS:
 *   NOT READY TO CLOSE — any hard failure
 *   READY WITH WARNINGS — soft warnings / score < 10 with evaluations complete
 *   READY TO CLOSE — hard=0, evaluations complete, every category 10/10
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatedHeader, normalizeText, repoRoot } from "./lib/scan.mjs";

const DAILY_HEADER = generatedHeader(
  "project-knowledge/scripts/daily-closeout.mjs"
);
import { computeQualityScore, loadQualityRules, writeQualityReports } from "./lib/quality-score.mjs";
import { gitProvenance } from "./lib/quality-score/provenance.mjs";
import { runGuardian, writeWarningsReport } from "./guardian.mjs";
import { runAiAudit } from "./ai-audit.mjs";

const __filename = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

function npmBin() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function run(root, script, timeout = 300_000) {
  if (!/^[a-z0-9:_-]+$/i.test(script)) {
    throw new Error(`Unsafe npm script name: ${script}`);
  }
  const r =
    process.platform === "win32"
      ? spawnSync(`${npmBin()} run ${script}`, {
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
  return {
    script,
    ok: !r.error && r.status === 0,
    status: r.status,
    output: [r.stdout, r.stderr].filter(Boolean).join("\n").trim().slice(-2000),
  };
}

function gitMeta(root) {
  const prov = gitProvenance(root);
  const changed = spawnSync("git", ["diff", "--name-only", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  return {
    commit: prov.commitShort,
    gitScope: prov.gitScope,
    gitNote: prov.note,
    changedFiles:
      !changed.error && changed.status === 0
        ? changed.stdout
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 80)
        : [],
  };
}

export async function runDailyCloseout(root = repoRoot()) {
  const date = new Date().toISOString().slice(0, 10);
  const steps = [];

  steps.push(run(root, "knowledge:update"));
  steps.push(run(root, "typecheck"));
  steps.push(run(root, "lint"));
  steps.push(run(root, "test"));

  const guardian = runGuardian(root);
  writeWarningsReport(root, guardian.hard, guardian.soft);

  const score = computeQualityScore(root, loadQualityRules(root), {
    withProbes: true,
  });
  writeQualityReports(root, score, { withProbes: true });

  const knowledgeCheck = run(root, "knowledge:check");
  steps.push(knowledgeCheck);
  const qualityCheck = run(root, "quality:check");
  steps.push(qualityCheck);

  let ai;
  try {
    ai = await runAiAudit(root);
  } catch (e) {
    ai = { status: "error", observations: e.message, advisoryOnly: true };
  }

  const hardFailures = [
    ...guardian.hard.map((h) => `${h.code}: ${h.message}`),
    ...steps.filter((s) => !s.ok).map((s) => `${s.script} failed (exit ${s.status})`),
  ];
  if (!score.officialScore.evaluationsComplete) {
    hardFailures.push("Quality probes incomplete (NOT_EVALUATED remain)");
  }

  const softWarnings = guardian.soft.map((w) => `${w.code}: ${w.message}`);
  const allCategoriesPerfect = score.categories.every(
    (c) => c.points === c.maxPoints
  );

  let status = "READY WITH WARNINGS";
  if (hardFailures.length) status = "NOT READY TO CLOSE";
  else if (
    softWarnings.length === 0 &&
    allCategoriesPerfect &&
    score.officialScore.perfectEligible &&
    score.officialScore.scoreOutOf10 === 10
  ) {
    status = "READY TO CLOSE";
  }

  const meta = gitMeta(root);
  const report = {
    schemaVersion: 2,
    kind: "daily-closeout",
    date,
    commit: meta.commit,
    status,
    scoreType: "Internal Engineering Quality Score",
    officialScore: score.officialScore,
    provenance: score.provenance,
    externalBaseline: score.externalBaseline,
    categories: score.categories.map((c) => ({
      id: c.id,
      label: c.label,
      points: c.points,
      maxPoints: c.maxPoints,
      scoreOutOf10: c.scoreOutOf10,
      checksContributing: c.checksContributing,
    })),
    hardFailures,
    softWarnings,
    deductions: score.deductions,
    probes: score.probeStatus,
    steps: steps.map((s) => ({ script: s.script, ok: s.ok, status: s.status })),
    aiAudit: {
      reviewType: "Advisory AI review",
      status: ai.status,
      provider: ai.provider,
      requestedModel: ai.requestedModel,
      returnedModel: ai.returnedModel,
      responseGeneratedFromLiveApi: ai.responseGeneratedFromLiveApi,
      aiAffectsOfficialScore: false,
      advisoryOnly: true,
      summary: String(ai.observations || "").slice(0, 1500),
    },
    changedFiles: meta.changedFiles,
    improvementsNote:
      "See git diff / session commits for completed work; this report does not invent progress.",
    remainingIssues: score.improvementPlan.slice(0, 12),
    recommendedNextPriority: score.improvementPlan[0]?.action || "None — maintain gates",
  };

  const dailyDir = path.join(
    root,
    "project-knowledge",
    "generated",
    "reports",
    "daily"
  );
  fs.mkdirSync(dailyDir, { recursive: true });
  const datedJson = path.join(dailyDir, `${date}.json`);
  const datedMd = path.join(dailyDir, `${date}.md`);
  const latestJson = path.join(
    root,
    "project-knowledge",
    "generated",
    "reports",
    "daily-latest.json"
  );
  const latestMd = path.join(
    root,
    "project-knowledge",
    "generated",
    "reports",
    "DAILY_LATEST.md"
  );

  const mdBody = normalizeText(
    [
      `# Daily closeout — ${date}`,
      ``,
      `**STATUS: ${status}**`,
      ``,
      `- Commit SHA: \`${meta.commit}\``,
      `- Git scope: \`${meta.gitScope || "unknown"}\``,
      ...(meta.gitNote ? [`- Git note: ${meta.gitNote}`] : []),
      `- Internal Engineering Quality Score: **${score.officialScore.scoreOutOf10}/10** (MarketMonth rubric \`${score.rubricVersion}\`)`,
      `- Formula: \`${score.officialScore.formula}\``,
      `- Perfect-score eligible: \`${score.officialScore.perfectEligible ? "yes" : "no"}\``,
      `- Evaluations complete: \`${score.officialScore.evaluationsComplete ? "yes" : "no"}\``,
      `- External Baseline Coverage: **${score.externalBaseline?.coveragePercent ?? "n/a"}%** (\`${score.externalBaseline?.externalValidationStatus || "n/a"}\`)`,
      `- External certification: \`None\``,
      ``,
      `> Internal score is not industry-certified or independently certified.`,
      ``,
      `## Category scores`,
      ``,
      ...score.categories.map(
        (c) =>
          `- ${c.label}: ${c.points}/${c.maxPoints} (${c.scoreOutOf10}/10) — checks: ${(c.checksContributing || []).join(", ")}`
      ),
      ``,
      `## Hard failures (${hardFailures.length})`,
      ``,
      ...(hardFailures.length ? hardFailures.map((h) => `- ${h}`) : ["None."]),
      ``,
      `## Soft warnings (${softWarnings.length})`,
      ``,
      ...(softWarnings.length ? softWarnings.map((w) => `- ${w}`) : ["None."]),
      ``,
      `## Probe results`,
      ``,
      `- typecheck: ${score.probeStatus?.typecheck?.status} (exit ${score.probeStatus?.typecheck?.exitCode ?? "n/a"})`,
      `- lint: ${score.probeStatus?.lint?.status} (exit ${score.probeStatus?.lint?.exitCode ?? "n/a"})`,
      `- test: ${score.probeStatus?.test?.status} (exit ${score.probeStatus?.test?.exitCode ?? "n/a"})`,
      ``,
      `## AI advisory`,
      ``,
      `- Status: \`${ai.status}\``,
      `- Provider: \`${ai.provider || "n/a"}\``,
      `- Live API: \`${ai.responseGeneratedFromLiveApi ? "yes" : "no"}\``,
      `- AI influence on official score: **none**`,
      ``,
      String(ai.observations || "").slice(0, 2000),
      ``,
      `## Remaining issues`,
      ``,
      ...(report.remainingIssues.length
        ? report.remainingIssues.map(
            (i) => `- \`${i.ruleId}\` (${i.priority}): ${i.action}`
          )
        : ["None."]),
      ``,
      `## Recommended next priority`,
      ``,
      report.recommendedNextPriority,
      ``,
      `## Changed files (working tree vs HEAD)`,
      ``,
      ...(meta.changedFiles.length
        ? meta.changedFiles.map((f) => `- \`${f}\``)
        : ["(clean or unavailable)"]),
      ``,
    ].join("\n")
  );

  fs.writeFileSync(datedJson, normalizeText(JSON.stringify(report, null, 2)));
  fs.writeFileSync(datedMd, DAILY_HEADER + mdBody);
  fs.writeFileSync(latestJson, normalizeText(JSON.stringify(report, null, 2)));
  fs.writeFileSync(latestMd, DAILY_HEADER + mdBody);

  return { status, report, latestMd, latestJson };
}

if (isMain) {
  const { status, report, latestMd } = await runDailyCloseout(repoRoot());
  console.error(`daily:closeout — ${status}`);
  console.error(
    `score ${report.officialScore.scoreOutOf10}/10 — report ${latestMd}`
  );
  if (status === "NOT READY TO CLOSE") process.exit(1);
}
