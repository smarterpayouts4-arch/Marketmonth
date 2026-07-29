/**
 * Compare discovery card copy: deterministic (Arm A) vs LLM display polish (Arm B).
 *
 * Read-only against repo data. Arm B calls the product polish module
 * (`src/engine/discovery/discovery-narrative/polish/polish-display-copy.ts`)
 * — the same post-step used by POST /api/discovery/analyze.
 *
 * Usage:
 *   npx tsx scripts/compare-discovery-copy.ts
 *   npx tsx scripts/compare-discovery-copy.ts --company zynava.com --state approved
 *   npx tsx scripts/compare-discovery-copy.ts --no-llm
 *   npx tsx scripts/compare-discovery-copy.ts --out tmp/compare-discovery.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";

import { buildDiscoveryNarrative } from "../src/engine/discovery/discovery-narrative";
import { parseCompanyCsv } from "../src/lib/company-profile/csv-contract";
import {
  polishDiscoveryDisplayCopy,
  type PolishRejection,
} from "../src/engine/discovery/discovery-narrative/polish/polish-display-copy";
import {
  toCardView,
  type CardEvidenceRow,
  type CardView,
} from "./lib/format-discovery-card";

config({ path: ".env.local" });
config({ path: ".env" });

const DEFAULT_MODEL = "gpt-5.4-nano";
const COL = 52;

type Args = {
  company: string;
  state: "approved" | "draft";
  llm: boolean;
  model: string;
  out?: string;
};

function parseArgs(argv: string[]): Args {
  const value = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const state = value("--state") === "draft" ? "draft" : "approved";
  return {
    company: value("--company") ?? "zynava.com",
    state,
    llm: !argv.includes("--no-llm"),
    model:
      value("--model") ??
      process.env.OPENAI_DISCOVERY_POLISH_MODEL ??
      process.env.OPENAI_DISCOVERY_MODEL ??
      DEFAULT_MODEL,
    out: value("--out"),
  };
}

function wrap(text: string, width: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (!line.length) {
      line = word;
    } else if (`${line} ${word}`.length <= width) {
      line = `${line} ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line.length) lines.push(line);
  return lines.length ? lines : [""];
}

function twoColumn(label: string, left: string, right: string): void {
  const leftLines = wrap(left, COL);
  const rightLines = wrap(right, COL);
  const height = Math.max(leftLines.length, rightLines.length);
  const labelPad = 18;
  for (let i = 0; i < height; i += 1) {
    const tag = i === 0 ? label.padEnd(labelPad) : " ".repeat(labelPad);
    const l = (leftLines[i] ?? "").padEnd(COL);
    const r = rightLines[i] ?? "";
    console.log(`${tag}│ ${l} │ ${r}`);
  }
}

function divider(char = "─"): void {
  console.log(
    `${char.repeat(18)}┼${char.repeat(COL + 2)}┼${char.repeat(COL + 2)}`
  );
}

function same(a: string | undefined, b: string | undefined): string {
  return (a ?? "") === (b ?? "") ? "  (identical)" : "  ← DIFFERS";
}

function printTab(
  index: number,
  armA: CardView,
  armB: CardView,
  llmEnabled: boolean
): void {
  const a = armA.tabs[index]!;
  const b = armB.tabs[index]!;
  console.log("");
  console.log("=".repeat(126));
  console.log(`TAB ${index + 1}/3 — ${a.label}`);
  console.log("=".repeat(126));
  console.log(
    `${" ".repeat(18)}│ ${"A · DETERMINISTIC".padEnd(COL)} │ ${
      llmEnabled ? "B · LLM POLISHED" : "B · (llm disabled)"
    }`
  );
  divider();

  if (index === 0) {
    twoColumn("Intro headline", armA.introHeadline, armB.introHeadline);
    twoColumn("Intro text", armA.introDescription, armB.introDescription);
    divider();
  }
  twoColumn("Question", a.question, b.question);
  twoColumn(
    "Insight",
    a.insight ?? "(suppressed — duplicates observed evidence)",
    b.insight ?? "(suppressed — duplicates observed evidence)"
  );
  if (a.clarification || b.clarification) {
    twoColumn("Clarification", a.clarification ?? "", b.clarification ?? "");
  }
  divider();

  a.rows.forEach((rowA, i) => {
    const rowB = b.rows[i]!;
    twoColumn(
      `Row ${i + 1} title`,
      `${rowA.title}${rowA.tag ? `  [${rowA.tag}]` : ""}`,
      `${rowB.title}${rowB.tag ? `  [${rowB.tag}]` : ""}`
    );
    twoColumn(`Row ${i + 1} summary`, rowA.summary, rowB.summary);
    console.log(
      `${" ".repeat(18)}│ ${`kind=${rowA.kind} source=${rowA.sourceLabel}`.padEnd(
        COL
      )} │${same(rowA.title + rowA.summary, rowB.title + rowB.summary)}`
    );
    divider("·");
  });

  twoColumn("Takeaway", a.takeaway ?? "(none)", b.takeaway ?? "(none)");
  twoColumn("Transition", a.transition ?? "(none)", b.transition ?? "(none)");
}

function printExpandedDetail(armA: CardView): void {
  console.log("");
  console.log("=".repeat(126));
  console.log("EXPANDED ROW CONTENT (identical in both arms — polish is display-only)");
  console.log("=".repeat(126));
  for (const tab of armA.tabs) {
    console.log("");
    console.log(`[${tab.label}]`);
    tab.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.title}`);
      if (row.detail) {
        for (const line of wrap(`Detail: ${row.detail}`, 108)) {
          console.log(`     ${line}`);
        }
      }
      if (row.supportingPoints.length) {
        console.log(`     Why we believe this:`);
        for (const point of row.supportingPoints) {
          for (const line of wrap(`· ${point}`, 104)) {
            console.log(`       ${line}`);
          }
        }
      }
      console.log(`     Source: ${row.sourceLabel}`);
    });
  }
}

function printContentPlayExtras(view: CardView): void {
  const cp = view.contentPlay;
  console.log("");
  console.log("=".repeat(126));
  console.log("TAB 3 EXTRAS (deterministic — not polished)");
  console.log("=".repeat(126));
  console.log("Pillars:");
  for (const pillar of cp.pillars) {
    console.log(`  · ${pillar.name} — ${pillar.description}`);
  }
  console.log("");
  console.log("Platform adaptations:");
  for (const a of cp.adaptations) {
    console.log(`  · ${a.platform} [${a.status}] — ${a.guidance}`);
  }
  console.log("");
  console.log(`Cadence: ${cp.cadenceLabel}`);
  console.log(`  ${cp.cadenceDescription}`);
  console.log("");
  console.log(`Core topic: ${cp.coreTopic}`);
  console.log(`Purpose: ${cp.strategicPurpose}`);
  for (const piece of cp.pieces) {
    console.log(`  ${piece.day} · ${piece.platform} · ${piece.format}`);
    console.log(`    ${piece.hook}`);
  }
  console.log("");
  console.log(`Final direction: ${cp.finalDirection}`);
  console.log(`Investment question: ${cp.investmentQuestion}`);
}

function printRejections(rejections: PolishRejection[], polished: number, total: number): void {
  console.log("");
  console.log("=".repeat(126));
  console.log("GUARDRAIL REPORT (fail-closed: rejected rows keep deterministic copy)");
  console.log("=".repeat(126));
  console.log(`Accepted ${polished}/${total} rows.`);
  if (!rejections.length) {
    console.log("No rows rejected by validators.");
    return;
  }
  for (const r of rejections) {
    console.log(`  ✗ ${r.id} — ${r.reason}`);
    if (r.attempted) {
      for (const line of wrap(`attempted: ${r.attempted}`, 108)) {
        console.log(`      ${line}`);
      }
    }
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const csvPath = path.join(
    process.cwd(),
    "data",
    "companies",
    args.company,
    `${args.state}.csv`
  );
  if (!existsSync(csvPath)) {
    console.error(`No CSV at ${csvPath}`);
    process.exitCode = 1;
    return;
  }

  const projection = parseCompanyCsv(readFileSync(csvPath, "utf8"));
  const narrative = buildDiscoveryNarrative({ projection });
  const armA = toCardView(narrative);

  console.log("");
  console.log(
    `=== DISCOVERY CARD A/B — ${armA.businessName} (${args.company} · ${args.state}.csv) ===`
  );
  console.log(`Evidence quality: ${armA.evidenceQuality}`);
  console.log(
    `Arm A: deterministic engine    Arm B: ${
      args.llm ? `display polish via ${args.model}` : "disabled (--no-llm)"
    }`
  );

  const allRows: CardEvidenceRow[] = armA.tabs.flatMap((t) => t.rows);
  let armB = armA;
  let rejections: PolishRejection[] = [];
  let polishedCount = 0;
  let polishError: string | undefined;

  if (args.llm) {
    // The engine resolves its model from the registry, so --model is applied
    // through the same env override the product uses.
    if (args.model) process.env.OPENAI_DISCOVERY_POLISH_MODEL = args.model;
    delete process.env.DISCOVERY_COPY_POLISH_PROVIDER;
    const outcome = await polishDiscoveryDisplayCopy(narrative);
    rejections = outcome.report.rejections;
    polishedCount = outcome.report.polishedCount;
    polishError = outcome.report.error;
    armB = toCardView(outcome.profile);
  }

  if (polishError) {
    console.log(`Arm B error: ${polishError} (falling back to deterministic)`);
  }

  for (let i = 0; i < armA.tabs.length; i += 1) {
    printTab(i, armA, armB, args.llm && !polishError);
  }

  if (args.llm) {
    printRejections(rejections, polishedCount, allRows.length);
  }

  printExpandedDetail(armA);
  printContentPlayExtras(armA);

  if (args.out) {
    const outPath = path.join(process.cwd(), args.out);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(
      outPath,
      JSON.stringify(
        {
          company: args.company,
          state: args.state,
          model: args.llm ? args.model : null,
          generatedAt: new Date().toISOString(),
          armA,
          armB,
          rejections,
          polishedCount,
          polishError: polishError ?? null,
        },
        null,
        2
      ),
      "utf8"
    );
    console.log("");
    console.log(`Wrote ${args.out}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
