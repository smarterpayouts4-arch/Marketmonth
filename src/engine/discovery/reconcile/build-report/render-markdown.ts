import type { ReconciliationReport } from "../types";

import { normName } from "./names";

export function renderReconciliationMarkdown(
  report: ReconciliationReport
): string {
  const lines: string[] = [];
  lines.push("# Zynava Discovery Reconciliation Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push("## Safety");
  lines.push(
    `- Approved CSV unchanged: **${report.approvedCsvUnchanged ? "YES" : "NO"}**`
  );
  lines.push(`- SHA-256 before: \`${report.approvedCsvSha256Before}\``);
  lines.push(`- SHA-256 after: \`${report.approvedCsvSha256After}\``);
  lines.push(`- Path: \`${report.approvedCsvPath}\``);
  lines.push("");
  lines.push("## Omega-3");
  const omega = report.catalogExplanations.find(
    (c) => normName(c.name) === "omega-3"
  );
  if (omega) {
    lines.push(`- In fixture CSV: ${omega.inFixtureCsv}`);
    lines.push(`- In analyze profile: ${omega.inAnalyzeProfile}`);
    lines.push(`- In frozen corpus text: ${omega.inFrozenCorpusText}`);
    lines.push(`- Likely cause: **${omega.likelyCause}**`);
    lines.push(`- ${omega.detail}`);
    for (const p of omega.pagesWithTerm.slice(0, 2)) {
      lines.push(`  - ${p.url} (\`${p.pageId}\`): ${p.excerpt.slice(0, 200)}`);
    }
  } else {
    lines.push("- No Omega-3 explanation generated.");
  }
  lines.push("");
  lines.push("## Calcium");
  const calcium = report.catalogExplanations.find(
    (c) => normName(c.name) === "calcium"
  );
  if (calcium) {
    lines.push(`- In fixture CSV: ${calcium.inFixtureCsv}`);
    lines.push(`- In analyze profile: ${calcium.inAnalyzeProfile}`);
    lines.push(`- In frozen corpus text: ${calcium.inFrozenCorpusText}`);
    lines.push(`- Likely cause: **${calcium.likelyCause}**`);
    lines.push(`- ${calcium.detail}`);
    for (const p of calcium.pagesWithTerm.slice(0, 2)) {
      lines.push(`  - ${p.url} (\`${p.pageId}\`): ${p.excerpt.slice(0, 200)}`);
    }
  } else {
    lines.push("- No Calcium explanation generated.");
  }
  lines.push("");
  lines.push("## Product / service wording");
  lines.push(report.productServiceWording.explanation);
  lines.push("");
  lines.push("### Fixture products (curated platform capabilities)");
  for (const p of report.productServiceWording.fixtureProducts) {
    lines.push(`- ${p}`);
  }
  lines.push("");
  lines.push("### Analyze products (derived LLM wording — not observed SKUs)");
  for (const p of report.productServiceWording.analyzeProducts) {
    lines.push(`- ${p}`);
  }
  lines.push("");
  lines.push("## Diagnostics");
  for (const d of report.diagnostics) lines.push(`- ${d}`);
  if (!report.diagnostics.length) lines.push("- (none)");
  lines.push("");
  lines.push("## Counts");
  lines.push(`- agreedFacts: ${report.agreedFacts.length}`);
  lines.push(`- fixtureOnly: ${report.fixtureOnly.length}`);
  lines.push(`- analyzeOnly: ${report.analyzeOnly.length}`);
  lines.push(`- contradictions: ${report.contradictions.length}`);
  lines.push(`- missingEvidence: ${report.missingEvidence.length}`);
  lines.push(
    `- unresolvedObservedContradictions: ${report.unresolvedObservedContradictions.length}`
  );
  lines.push("");
  return lines.join("\n");
}
