import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { validateContentAtom } from "@/brain/atom";
import { channelRegistry, isChannelEnabled } from "@/brain/channels/channel-registry";
import {
  generateYouTubeShortPackage,
  validateYouTubeShortPackage,
} from "@/brain/channels/youtube-short";
import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import { compileBrandCore, toBrandCoreSlice } from "@/brain/core";
import { runCoreContentBrain } from "@/brain/pipeline";
import { runDeterministicQa } from "@/brain/qa";
import { assertStrategyLock } from "@/brain/strategy-lock";
import { defaultImageProviderConfig } from "@/brain/render";

function loadFixtureContext() {
  const text = readFileSync(
    path.join(process.cwd(), "data/companies/zynava.com/approved.csv"),
    "utf8"
  );
  const context = parseFixtureCsv(text);
  assert.ok(context);
  return context;
}

const sampleSelected = {
  masterTopic: {
    id: "master_test",
    source: "automatic" as const,
    punchline: "How to make clearer marketing decisions with Zynava",
    subheading: "Umbrella",
    rationale: "From fixture",
    evidenceIds: [] as string[],
    confidence: "high" as const,
    safety: { status: "safe" as const, reasons: [] as string[] },
  },
  variation: {
    id: "var_decision",
    angle: "decision_guide" as const,
    punchline: "Decide what to say this month without drowning in ideas",
    subheading: "Decision support",
    brief: "Help operators pick one direction first.",
    audienceProblem: "Too many disconnected content ideas",
    strategicPurpose: "Position as decision partner",
    evidenceIds: [] as string[],
    assumptionIds: [] as string[],
    confidence: "high" as const,
    safety: { status: "safe" as const, reasons: [] as string[] },
  },
};

describe("canonical content pipeline", () => {
  it("compiles Brand Core from fixture context", () => {
    const context = loadFixtureContext();
    const core = compileBrandCore(context);
    assert.equal(core.brand_name, context.brandName);
    assert.ok(core.version.startsWith("bc_"));
    assert.ok(core.proof_library.length > 0);
    const slice = toBrandCoreSlice(core);
    assert.equal(slice.version, core.version);
  });

  it("channel registry enables only YouTube Short", () => {
    assert.equal(isChannelEnabled("youtubeShort"), true);
    assert.equal(channelRegistry.facebook.status, "not_connected");
    assert.equal(channelRegistry.tiktok.status, "not_connected");
    assert.equal(channelRegistry.youtubeLong.status, "not_connected");
  });

  it("Core Content Brain produces a ready Content Atom", async () => {
    const context = loadFixtureContext();
    const result = await runCoreContentBrain({
      context,
      preferLlm: false,
      selected: sampleSelected,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    const atom = result.atom;
    assert.equal(atom.status, "ready");
    assert.ok(atom.hook_strategy.opening_intent);
    assert.ok(atom.hook_strategy.planted_question);
    assert.ok(atom.promised_payoff);
    assert.ok(atom.central_claim.canonical_wording);
    assert.ok(atom.supporting_proof.length >= 1);
    assert.ok(atom.message_hash.startsWith("mh_"));
    assert.doesNotMatch(atom.creative_mode, /facebook|tiktok|youtube/i);

    const validated = validateContentAtom(atom);
    assert.equal(validated.ok, true);
  });

  it("YouTube Short specialist pins StrategyLock and rejects forged claims", async () => {
    const context = loadFixtureContext();
    const brain = await runCoreContentBrain({
      context,
      preferLlm: false,
      selected: sampleSelected,
    });
    assert.equal(brain.ok, true);
    if (!brain.ok) return;

    const adapted = generateYouTubeShortPackage({ atom: brain.atom });
    assert.equal(adapted.ok, true);
    if (!adapted.ok) return;

    const lock = assertStrategyLock(brain.atom, adapted.package.strategy_lock, {
      claim_ids: adapted.package.claim_ids_used,
      proof_ids: adapted.package.proof_ids_used,
    });
    assert.equal(lock.ok, true);

    const forged = {
      ...adapted.package,
      claim_ids_used: [...adapted.package.claim_ids_used, "claim_forged"],
    };
    const forgedCheck = validateYouTubeShortPackage(brain.atom, forged);
    assert.equal(forgedCheck.ok, false);

    const qa = runDeterministicQa({
      atom: brain.atom,
      brandCore: brain.brandCore,
      youtubeShortPackage: adapted.package,
      imageConfig: defaultImageProviderConfig(),
    });
    assert.equal(qa.ok, true);
  });
});
