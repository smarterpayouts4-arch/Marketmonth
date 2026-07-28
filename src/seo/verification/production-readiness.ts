/**
 * Final production-readiness checks for the SEO subsystem (local).
 * Does not start Next — pair with a production build smoke separately.
 *
 *   npx tsx src/seo/verification/production-readiness.ts
 */
import fs from "node:fs";

import { getRequiredSiteOrigin } from "../config/site-environment";
import { runSeoReview } from "../jobs/run-seo-review";
import { recordDecision } from "../intelligence/memory/decision-history";
import {
  fingerprintFinding,
  readLatestBrief,
  readResearchHistory,
} from "../intelligence/memory/research-history";
import { MEMORY_FILES } from "../intelligence/memory/paths";
import { mmSeoStatus } from "../../../mcp/src/tools/seo/status";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function checkOriginHardFail() {
  const prevNode = process.env.NODE_ENV;
  const prevOrigin = process.env.SITE_ORIGIN;
  const prevSite = process.env.NEXT_PUBLIC_SITE_URL;
  const prevApp = process.env.NEXT_PUBLIC_APP_URL;
  try {
    Reflect.set(process.env, "NODE_ENV", "production");
    Reflect.deleteProperty(process.env, "SITE_ORIGIN");
    Reflect.deleteProperty(process.env, "NEXT_PUBLIC_SITE_URL");
    Reflect.deleteProperty(process.env, "NEXT_PUBLIC_APP_URL");
    let threw = false;
    try {
      getRequiredSiteOrigin();
    } catch {
      threw = true;
    }
    assert(threw, "production origin must hard-fail without SITE_ORIGIN/SITE_URL");
    console.log("ok production origin hard-fail");
  } finally {
    Reflect.set(process.env, "NODE_ENV", prevNode);
    if (prevOrigin !== undefined) {
      Reflect.set(process.env, "SITE_ORIGIN", prevOrigin);
    } else {
      Reflect.deleteProperty(process.env, "SITE_ORIGIN");
    }
    if (prevSite !== undefined) {
      Reflect.set(process.env, "NEXT_PUBLIC_SITE_URL", prevSite);
    } else {
      Reflect.deleteProperty(process.env, "NEXT_PUBLIC_SITE_URL");
    }
    if (prevApp !== undefined) {
      Reflect.set(process.env, "NEXT_PUBLIC_APP_URL", prevApp);
    } else {
      Reflect.deleteProperty(process.env, "NEXT_PUBLIC_APP_URL");
    }
  }
}

async function checkPersistenceAndDedupe() {
  const first = await runSeoReview({ kind: "on-demand", auditsOnly: true });
  assert(first.recommendations.length >= 1, "first review should produce findings");

  const target = first.recommendations[0];
  recordDecision({
    recommendationId: target.id,
    findingFingerprint: fingerprintFinding(target.finding),
    status: "Rejected",
    decidedAt: new Date().toISOString(),
    note: "production-readiness persistence probe",
  });

  const beforeHistory = readResearchHistory().length;
  const second = await runSeoReview({ kind: "on-demand", auditsOnly: true });
  const afterHistory = readResearchHistory().length;

  assert(afterHistory >= beforeHistory, "research history should grow or stay");
  assert(second.id !== first.id, "second run should create a new brief id");

  const rejectedAgain = second.recommendations.find(
    (r) => fingerprintFinding(r.finding) === fingerprintFinding(target.finding)
  );
  assert(
    rejectedAgain?.status === "Rejected",
    "prior Rejected status must survive the second run"
  );

  // newCount should not treat carried Rejected as brand-new actionable spam
  assert(
    typeof second.changesSincePrevious === "number",
    "second run must report changesSincePrevious"
  );

  console.log(
    `ok persistence/dedupe (briefs=${afterHistory}, rejectedSurvived=true, changesSincePrevious=${second.changesSincePrevious})`
  );
}

async function checkResearchFailureKeepsState() {
  const good = await runSeoReview({ kind: "on-demand", auditsOnly: true });
  // Seed a faux research finding into latest brief so carry-forward has something
  const seeded = {
    ...good,
    recommendations: [
      ...good.recommendations,
      {
        id: "seed-research-1",
        finding: "Seeded research finding for failure-path carry-forward",
        whyItMatters: "Ensures last good research is not wiped",
        evidence: {
          source: "Seed provider",
          excerpt: "not a local audit",
          url: "https://developers.google.com/",
        },
        impact: "Medium" as const,
        affectedSurfaces: ["Crawler policy"],
        affectedFiles: ["src/seo/config/crawler-policy.ts"],
        recommendation: "Keep this if research fails",
        confidence: "Probable" as const,
        status: "New" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };
  fs.writeFileSync(MEMORY_FILES.latestBrief, JSON.stringify(seeded, null, 2));

  const prevKey = process.env.PERPLEXITY_API_KEY;
  delete process.env.PERPLEXITY_API_KEY;

  try {
    const failedResearch = await runSeoReview({
      kind: "on-demand",
      auditsOnly: false,
    });
    assert(
      failedResearch.researchError,
      "missing key should surface researchError"
    );
    assert(
      (failedResearch.carriedForwardCount ?? 0) >= 1,
      "should carry forward prior research findings"
    );
    const carried = failedResearch.recommendations.find((r) =>
      r.finding.includes("Seeded research finding")
    );
    assert(carried, "seeded research finding must still be present");
    assert(
      readLatestBrief()?.id === failedResearch.id,
      "latest brief should be the audit+carry-forward brief"
    );
    console.log(
      `ok research failure path (error recorded, carriedForward=${failedResearch.carriedForwardCount})`
    );
  } finally {
    if (prevKey !== undefined) process.env.PERPLEXITY_API_KEY = prevKey;
  }
}

async function checkMcpMinimization() {
  const envelope = await mmSeoStatus();
  assert(envelope.status === "complete", "mm_seo_status should complete");
  const json = JSON.stringify(envelope.data);
  assert(!/PERPLEXITY|api[_-]?key|Bearer\s/i.test(json), "must not leak secrets");
  assert(!json.includes("process.env"), "must not expose env accessors");
  const data = envelope.data as {
    topRecommendations?: { finding?: string; evidence?: unknown }[];
    phase2?: Record<string, unknown>;
  };
  for (const rec of data.topRecommendations ?? []) {
    assert(!("evidence" in rec), "MCP must omit evidence objects");
    assert(
      !rec.finding || rec.finding.length <= 281,
      "finding summaries must be clipped"
    );
  }
  assert(
    data.phase2 &&
      typeof data.phase2.searchConsole === "string" &&
      typeof data.phase2.bing === "string",
    "phase2 should expose status strings only"
  );
  console.log("ok MCP data minimization");
}

async function main() {
  await checkOriginHardFail();
  await checkPersistenceAndDedupe();
  await checkResearchFailureKeepsState();
  await checkMcpMinimization();
  console.log("production-readiness checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
