/**
 * Seed one locked Content Atom into the atom repository for Studio UI checks.
 * Usage: npx tsx scripts/seed-studio-atom.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { readFileSync } from "node:fs";
import path from "node:path";

import { approveAtom, deriveLimitations, lockAtom } from "../src/brain/atom";
import { parseFixtureCsv } from "../src/brain/content/repository/parse-fixture-csv";
import { runCoreContentBrain } from "../src/brain/pipeline";
import { createAtomRepository } from "../src/brain/store";

async function main() {
  const text = readFileSync(
    path.join(process.cwd(), "data/companies/zynava.com/approved.csv"),
    "utf8"
  );
  const context = parseFixtureCsv(text);
  if (!context) throw new Error("fixture parse failed");

  const brain = await runCoreContentBrain({
    context,
    preferLlm: false,
    selected: {
      masterTopic: {
        id: "master_studio_seed",
        source: "automatic",
        punchline: "How to make clearer marketing decisions with Zynava",
        subheading: "Umbrella",
        rationale: "Studio seed",
        evidenceIds: [],
        confidence: "high",
        safety: { status: "safe", reasons: [] },
      },
      variation: {
        id: "var_studio_seed",
        angle: "decision_guide",
        punchline: "Decide what to say this month without drowning in ideas",
        subheading: "Decision support",
        brief: "Help operators pick one direction first.",
        audienceProblem: "Too many disconnected content ideas",
        strategicPurpose: "Position as decision partner",
        evidenceIds: [],
        assumptionIds: [],
        confidence: "high",
        safety: { status: "safe", reasons: [] },
      },
    },
  });
  if (!brain.ok) throw new Error("brain failed");

  const limitations = deriveLimitations(brain.atom, null);
  const approved = approveAtom(brain.atom, {
    limitationsAcknowledgement:
      brain.atom.buildStatus === "limited"
        ? {
            acknowledgedAt: new Date().toISOString(),
            limitations:
              limitations.length > 0
                ? limitations
                : ["limited atom acknowledged for studio seed"],
          }
        : undefined,
  });
  if (!approved.ok) throw new Error(approved.error);
  const locked = lockAtom(approved.atom);
  if (!locked.ok) throw new Error(locked.error);

  const repo = createAtomRepository();
  const saved = await repo.save(locked.atom, {
    validationReport: brain.report ?? null,
    buildKey: `studio-seed-${Date.now()}`,
  });

  console.log(
    JSON.stringify(
      { atomId: saved.atom.atom_id, companyId: saved.company_id },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
