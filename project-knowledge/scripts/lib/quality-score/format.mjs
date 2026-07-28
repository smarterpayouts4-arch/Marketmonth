import { normalizeText } from "../scan.mjs";

export function formatQualityScoreMd(score) {
  const p = score.provenance || {};
  const ext = score.externalBaseline || {};
  const lines = [
    `# QUALITY_SCORE`,
    ``,
    `## Internal Engineering Quality Score`,
    ``,
    `**${score.officialScore.scoreOutOf10}/10** (\`${score.officialScore.formula}\`)`,
    ``,
    `> ${score.officialScore.disclaimer || "Internal rubric score only — not external certification."}`,
    ``,
    `### Provenance`,
    ``,
    `- Score type: \`${p.scoreType || "Internal Engineering Quality Score"}\``,
    `- Rubric version: \`${score.rubricVersion}\``,
    `- Rubric file hash: \`${p.rubricFileHash || "unavailable"}\``,
    `- Commit SHA: \`${p.commitSha || "unavailable"}\``,
    `- Working tree status: \`${p.workingTreeStatus || "unavailable"}\``,
    `- Git scope: \`${p.gitScope || "unknown"}\``,
    ...(p.gitNote ? [`- Git note: ${p.gitNote}`] : []),
    `- Commands executed: ${(p.commandsExecuted || []).map((c) => `\`${c}\``).join(", ") || "n/a"}`,
    `- Generated from real execution: \`${p.generatedFromRealExecution ? "yes" : "no"}\``,
    `- Probe status: typecheck=\`${score.probeStatus?.typecheck?.status}\` lint=\`${score.probeStatus?.lint?.status}\` test=\`${score.probeStatus?.test?.status}\``,
    `- Passed probes: ${(p.passedProbes || []).join(", ") || "(none)"}`,
    `- Failed probes: ${(p.failedProbes || []).join(", ") || "(none)"}`,
    `- Skipped probes: ${(p.skippedProbes || []).join(", ") || "(none)"}`,
    `- Not-evaluated probes/rules: ${
      [...(p.notEvaluatedProbes || []), ...(score.officialScore.notEvaluatedRules || [])].join(
        ", "
      ) || "(none)"
    }`,
    `- Perfect-score eligible: \`${score.officialScore.perfectEligible ? "yes" : "no"}\``,
    `- Evaluations complete: \`${score.officialScore.evaluationsComplete ? "yes" : "no"}\``,
    `- Hard knowledge failures: ${score.hardFailures}`,
    `- Soft knowledge warnings: ${score.softWarnings}`,
    `- Visible ignore patterns: \`${(p.visibleIgnorePatterns || []).join(", ")}\``,
    `- AI affects official score: \`no\``,
    ``,
    `## External Baseline Coverage`,
    ``,
    `- Coverage: **${ext.coveragePercent ?? "n/a"}%**`,
    `- External validation status: \`${ext.externalValidationStatus || "n/a"}\``,
    `- External certification: \`${ext.externalCertification || "None"}\``,
    ``,
    `> ${ext.note || "Separate from the internal score."}`,
    ``,
    `## Categories`,
    ``,
    `| Category | Score | /10 | Checks |`,
    `|---|---:|---:|---|`,
  ];
  for (const c of score.categories) {
    lines.push(
      `| ${c.label} | ${c.points}/${c.maxPoints} | ${c.scoreOutOf10} | ${(c.checksContributing || []).join(", ")} |`
    );
  }
  lines.push(``, `## Deductions`, ``);
  if (!score.deductions.length) {
    lines.push(
      "None — full points on all deterministic rules that were evaluated.",
      ``
    );
  } else {
    for (const d of score.deductions) {
      lines.push(`### \`${d.ruleId}\` (−${d.deducted}) [\`${d.status}\`]`);
      lines.push(``);
      lines.push(`- **Category:** ${d.category}`);
      lines.push(`- **Rule:** ${d.description}`);
      if (d.reason) lines.push(`- **Why it matters:** ${d.reason}`);
      lines.push(`- **Findings (${d.findingCount}):**`);
      for (const e of d.evidence) lines.push(`  - \`${e}\``);
      if (d.evidenceTruncated) lines.push(`  - …truncated`);
      lines.push(``);
    }
  }
  lines.push(`## Improvement plan`, ``);
  if (!score.improvementPlan.length) {
    lines.push("No open mechanical deductions on the internal rubric.", ``);
  } else {
    for (const step of score.improvementPlan) {
      lines.push(
        `- **${step.priority}** \`${step.ruleId}\`: ${step.action}`
      );
      for (const s of step.evidenceSample) lines.push(`  - \`${s}\``);
    }
    lines.push(``);
  }
  lines.push(`## AI review (advisory)`, ``);
  lines.push(score.aiReview.note);
  lines.push(``);
  lines.push(`AI influence on official score: **none**.`);
  lines.push(``);
  lines.push(`## Anti-gaming reminder`, ``);
  lines.push(
    "NOT_EVALUATED and failed probes cannot produce a perfect internal score. External baseline coverage is tracked separately and does not start at 100%."
  );
  lines.push(``);
  return normalizeText(lines.join("\n"));
}

export function printQualityTerminal(score) {
  const ext = score.externalBaseline || {};
  const lines = [
    `Internal Engineering Quality Score — ${score.officialScore.scoreOutOf10}/10 (MarketMonth rubric ${score.rubricVersion})`,
    `External Baseline Coverage — ${ext.coveragePercent ?? "?"}% (${ext.externalValidationStatus || "n/a"}; certification: none)`,
    ``,
  ];
  for (const c of score.categories) {
    const label = c.label.padEnd(32, " ");
    lines.push(`${label}${c.scoreOutOf10.toFixed(1)}`);
  }
  if (score.deductions.length) {
    lines.push(``, `Deductions:`);
    for (const d of score.deductions) {
      lines.push(
        `- ${d.ruleId}: ${d.findingCount} finding(s), −${d.deducted} [${d.status}]`
      );
    }
  }
  if (!score.officialScore.evaluationsComplete) {
    lines.push(``, `NOTE: evaluations incomplete — perfect score blocked`);
  }
  return lines.join("\n");
}
