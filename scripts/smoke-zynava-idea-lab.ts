/**
 * Measured Idea Lab smoke: Brand Core indexed products/FAQ + one topic-candidate run.
 * Writes data/runtime/discovery-reconcile/idea-lab-smoke.json
 *
 * Usage: npm run smoke:idealab -- --company zynava.com
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

config({ path: ".env.local" });
config({ path: ".env" });

import { getBrandCoreRepository } from "../src/brain/core/brand-core-repository";
import { runIdeaLabTopicCandidates } from "../src/brain/use-cases/run-idea-lab-topic-candidates";
import { companyArtifactPaths } from "../src/lib/company-profile/company-paths";

function companyFromArgv(): string {
  const idx = process.argv.indexOf("--company");
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1]!;
  const eq = process.argv.find((a) => a.startsWith("--company="));
  if (eq) return eq.slice("--company=".length);
  return "zynava.com";
}

async function main() {
  const companyId = companyFromArgv();
  const paths = companyArtifactPaths(companyId);
  const loaded = getBrandCoreRepository().getBrandCore(companyId);
  const indexedNames = (loaded.brandCore.indexed_products ?? []).map(
    (p) => p.name
  );
  const offerLower = loaded.brandCore.offers.map((o) => o.toLowerCase());
  const indexedLeakedIntoOffers = indexedNames.filter((n) =>
    offerLower.includes(n.toLowerCase())
  );
  const faqProofs = loaded.brandCore.proof_library.filter(
    (p) =>
      p.type === "faq" ||
      /does zynava|faq|\?/i.test(p.summary)
  );

  const outcome = await runIdeaLabTopicCandidates({
    companyId,
    marketingFocus: "product_education",
    liveIndustryResearch: false,
  });

  let topicSubjects: string[] = [];
  let indexedCited = false;
  let faqCited = false;
  let topicOk = false;
  let topicError: string | undefined;

  if (outcome.ok) {
    topicOk = true;
    const candidates = outcome.result.candidates ?? [];
    topicSubjects = candidates.flatMap((c) => {
      const title = c.title ?? "";
      const subjectLabel = c.subject?.label ?? "";
      return [title, subjectLabel].filter(Boolean);
    });
    const blob = topicSubjects.join(" ").toLowerCase();
    indexedCited = indexedNames.some((n) => blob.includes(n.toLowerCase()));
    faqCited =
      /faq|does zynava|sell supplements|not sell/i.test(blob) ||
      faqProofs.some((p) =>
        blob.includes(p.summary.slice(0, 24).toLowerCase())
      );
  } else {
    topicError = `${outcome.code}: ${outcome.error}`;
  }

  const indexedOnCoreOk = indexedNames.length >= 4;
  const indexedSeparatedOk = indexedLeakedIntoOffers.length === 0;

  const report = {
    generatedAt: new Date().toISOString(),
    fixturePath: loaded.fixturePath,
    indexedProductCount: indexedNames.length,
    indexedProducts: indexedNames,
    indexedLeakedIntoOffers,
    indexedOnCoreOk,
    indexedSeparatedOk,
    faqProofCount: faqProofs.length,
    faqProofOk: faqProofs.length > 0,
    topicOk,
    topicError,
    topicSubjectSample: topicSubjects.slice(0, 8),
    indexedCitedInTopics: indexedCited,
    faqCitedInTopics: faqCited,
    measuredLift:
      indexedOnCoreOk &&
      indexedSeparatedOk &&
      faqProofs.length > 0 &&
      topicOk &&
      (indexedCited || faqCited),
  };

  mkdirSync(dirname(paths.ideaLabSmoke), { recursive: true });
  writeFileSync(paths.ideaLabSmoke, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  console.log(`Wrote ${paths.ideaLabSmoke}`);

  if (!report.indexedOnCoreOk || !report.indexedSeparatedOk || !report.faqProofOk) {
    process.exitCode = 2;
  }
  if (!topicOk) {
    process.exitCode = 3;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
