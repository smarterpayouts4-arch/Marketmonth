import fs from "node:fs";
import path from "node:path";
import { generatedHeader, normalizeText } from "../lib/scan.mjs";

const GUARDIAN_HEADER = generatedHeader(
  "project-knowledge/scripts/guardian/report.mjs"
);

/**
 * @param {Array<{code:string,message:string}>} hard
 * @param {Array<{code:string,message:string}>} soft
 */
export function formatWarningsReport(hard, soft) {
  const lines = [
    `# STRUCTURE_WARNINGS`,
    ``,
    `Stable codes: use \`PK-WARN-NNN: acknowledged — <reason>\` in task closeout.`,
    ``,
    `## Hard failures (${hard.length})`,
    ``,
  ];
  if (!hard.length) lines.push("None.", "");
  else {
    for (const h of hard) lines.push(`- \`${h.code}\`: ${h.message}`);
    lines.push("");
  }
  lines.push(`## Soft warnings (${soft.length})`, ``);
  if (!soft.length) lines.push("None.", "");
  else {
    for (const w of soft) lines.push(`- \`${w.code}\`: ${w.message}`);
    lines.push("");
  }
  lines.push(`## Acknowledgement format`, ``, "```text");
  lines.push("Knowledge warnings:");
  lines.push("- PK-WARN-003: acknowledged — intentional temporary Discovery UI split");
  lines.push("```", "");
  return normalizeText(lines.join("\n"));
}

/**
 * @param {string} root
 * @param {Array<{code:string,message:string}>} hard
 * @param {Array<{code:string,message:string}>} soft
 */
export function writeWarningsReport(root, hard, soft) {
  const report = formatWarningsReport(hard, soft);
  const reportPath = path.join(
    root,
    "project-knowledge",
    "generated",
    "reports",
    "STRUCTURE_WARNINGS.md"
  );
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, GUARDIAN_HEADER + report, "utf8");
  return reportPath;
}
