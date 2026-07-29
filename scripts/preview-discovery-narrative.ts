/**
 * Preview the 3-section social discovery narrative for a company CSV.
 *
 * Usage:
 *   npx tsx scripts/preview-discovery-narrative.ts
 *   npx tsx scripts/preview-discovery-narrative.ts --company zynava.com
 *   npx tsx scripts/preview-discovery-narrative.ts --state draft
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { buildDiscoveryNarrative } from "../src/engine/discovery/discovery-narrative";
import { parseCompanyCsv } from "../src/lib/company-profile/csv-contract";

type Args = { company: string; state: "approved" | "draft" };

function parseArgs(argv: string[]): Args {
  const companyIdx = argv.indexOf("--company");
  const stateIdx = argv.indexOf("--state");
  const stateRaw = stateIdx >= 0 ? argv[stateIdx + 1] : "approved";
  return {
    company: companyIdx >= 0 ? argv[companyIdx + 1] : "zynava.com",
    state: stateRaw === "draft" ? "draft" : "approved",
  };
}

function main() {
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

  console.log(`\n=== DISCOVERY NARRATIVE — ${args.company} (${args.state}.csv) ===\n`);
  console.log(`Business: ${narrative.businessName}`);
  console.log(`Evidence quality: ${narrative.evidenceQuality}`);
  console.log(`\nIntro: ${narrative.introHeadline}`);
  console.log(`${narrative.introDescription}\n`);

  for (const [i, section] of narrative.sections.entries()) {
    console.log(`--- ${i + 1}. ${section.label} (${section.id}) ---`);
    console.log(`Subheading: ${section.subheading}`);
    console.log(`Headline: ${section.headline}`);
    for (const [j, bullet] of section.bullets.entries()) {
      console.log(
        `  ${j + 1}. [${bullet.classification}] ${bullet.text}`
      );
      for (const ev of bullet.evidence.slice(0, 2)) {
        console.log(
          `      ← ${ev.field} (${ev.evidenceType}/${ev.confidence}) ${ev.sourceUrl}`
        );
        if (ev.excerpt) {
          console.log(`        “${ev.excerpt.slice(0, 120)}${ev.excerpt.length > 120 ? "…" : ""}”`);
        }
      }
    }
    if (section.socialMeaning) {
      console.log(`Social meaning: ${section.socialMeaning}`);
    }
    console.log(`Reveal: ${section.reveal}`);
    if (section.transition) console.log(`Transition: ${section.transition}`);
    console.log("");
  }

  console.log("--- Content pillars ---");
  for (const p of narrative.contentPillars) {
    console.log(`• ${p.name} — ${p.description}`);
  }

  console.log("\n--- Detected channels ---");
  for (const c of narrative.detectedChannels) {
    const url = c.sourceUrl ? ` (${c.sourceUrl})` : "";
    console.log(`• ${c.platform}: ${c.status}${url}`);
  }

  console.log("\n--- Platform adaptations ---");
  for (const a of narrative.platformAdaptations) {
    console.log(`• ${a.platform} [${a.status}] — ${a.guidance}`);
    console.log(`  formats: ${a.formats.join(", ")}`);
  }

  console.log("\n--- Cadence (recommended by Market Month) ---");
  console.log(`Level: ${narrative.cadence.level}`);
  console.log(`Label: ${narrative.cadence.label}`);
  console.log(
    `Posts/week: ${narrative.cadence.postsPerWeekRange[0]}–${narrative.cadence.postsPerWeekRange[1]}`
  );
  console.log(narrative.cadence.description);
  for (const r of narrative.cadence.rationale) {
    console.log(`  · ${r}`);
  }

  console.log("\n--- Content universe preview ---");
  const u = narrative.contentUniversePreview;
  console.log(`Core topic: ${u.coreTopic}`);
  console.log(`Purpose: ${u.strategicPurpose}`);
  console.log(`Audience problem: ${u.audienceProblem}`);
  for (const piece of u.pieces) {
    console.log(
      `  Day+${piece.dayOffset} · ${piece.platform} · ${piece.format} · ${piece.objective}`
    );
    console.log(`    Hook: ${piece.hook}`);
    console.log(`    Angle: ${piece.angle}`);
  }

  console.log(`\nFinal direction: ${narrative.finalDirection}`);
  console.log(`Investment question: ${narrative.investmentQuestion}`);
  console.log(`Primary CTA: ${narrative.primaryCta}`);
  console.log(`Secondary CTA: ${narrative.secondaryCta}`);
  console.log("");
}

main();
