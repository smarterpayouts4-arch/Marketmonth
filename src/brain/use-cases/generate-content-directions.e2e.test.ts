import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { approveAtom, lockAtom } from "@/brain/atom";
import {
  generateYouTubeShortPackage,
  validateYouTubeShortPackage,
} from "@/brain/channels/youtube-short";
import { buildContentDirectionsHandoff } from "@/brain/content/handoff";
import { createBrandContextRepository } from "@/brain/content/repository/create-brand-context-repository";
import { resolveBrandCoreIdentity } from "@/brain/core";
import { runCoreContentBrain } from "@/brain/pipeline";
import { createTopicGenerationRepository } from "@/brain/store";
import { assertStrategyLock } from "@/brain/strategy-lock";

import { generateAndRecordContentDirections } from "./generate-content-directions";

describe("E2E: generation_id → Atom → YouTube Short", () => {
  let tempRoot: string;
  let historyPath: string;

  before(() => {
    tempRoot = mkdtempSync(path.join(tmpdir(), "mm-e2e-"));
    historyPath = path.join(tempRoot, "topic-generation-history.csv");
  });

  after(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("use case compiles Brand Core, records history, selection builds atom with same identity", async () => {
    const fixturePath = path.join(
      process.cwd(),
      "data/companies/zynava.com/approved.csv"
    );
    const historyRepo = createTopicGenerationRepository({
      filePath: historyPath,
    });

    const outcome = await generateAndRecordContentDirections({
      domain: "zynava.com",
      mode: "manual",
      topic: "Does magnesium actually help with sleep?",
      fixturePath,
      generationMode: "manual",
      runPurpose: "product",
      repository: historyRepo,
    });

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.notEqual(outcome.result.status, "blocked");
    if (outcome.result.status === "blocked") return;

    assert.ok(outcome.generationId?.startsWith("tgen_"));
    assert.ok(outcome.brandCoreId.startsWith("bc_"));
    assert.equal(outcome.result.generationId, outcome.generationId);
    assert.equal(outcome.historyPersisted, true);
    assert.equal(outcome.historyError, null);
    assert.equal(outcome.provider, "deterministic-v1");

    const stored = await historyRepo.getById(outcome.generationId!);
    assert.ok(stored);
    assert.equal(stored.brand_core_hash, outcome.brandCoreHash);
    assert.equal(stored.generation_provenance.brain_version, "deterministic-v1");
    assert.equal(stored.generation_provenance.prompt_version, "none");
    assert.equal(stored.generation_provenance.provider, "deterministic-v1");

    const selected = outcome.result.variations[0];
    const handoffBuilt = buildContentDirectionsHandoff({
      result: outcome.result,
      selectedVariationId: selected.id,
      brandDomain: "zynava.com",
    });
    assert.equal(handoffBuilt.ok, true);
    if (!handoffBuilt.ok) return;
    assert.equal(handoffBuilt.handoff.generationId, outcome.generationId);

    const brandRepo = createBrandContextRepository({
      source: "fixture",
      fixturePath: "data/companies/zynava.com/approved.csv",
    });
    const context = await brandRepo.loadByDomain("zynava.com");
    assert.ok(context);

    const brain = await runCoreContentBrain({
      context,
      preferLlm: false,
      selected: {
        masterTopic: outcome.result.masterTopic,
        variation: selected,
      },
    });
    assert.equal(brain.ok, true);
    if (!brain.ok) return;

    const identity = resolveBrandCoreIdentity(brain.brandCore);
    assert.equal(brain.atom.lineage.brandCoreId, identity.brand_core_id);
    assert.equal(brain.atom.lineage.brandCoreVersion, identity.brand_core_version);
    assert.equal(identity.brand_core_id, outcome.brandCoreId);
    assert.equal(identity.brand_core_hash, outcome.brandCoreHash);

    const approved = approveAtom(brain.atom);
    assert.equal(approved.ok, true);
    if (!approved.ok) return;
    const locked = lockAtom(approved.atom);
    assert.equal(locked.ok, true);
    if (!locked.ok) return;

    const pkg = generateYouTubeShortPackage({ atom: locked.atom });
    assert.equal(pkg.ok, true);
    if (!pkg.ok) return;
    assert.equal(pkg.package.source_atom_id, locked.atom.atom_id);
    const lock = assertStrategyLock(locked.atom, pkg.package.strategy_lock, {
      claim_ids: pkg.package.claim_ids_used,
      proof_ids: pkg.package.proof_ids_used,
    });
    assert.equal(lock.ok, true);
    const validated = validateYouTubeShortPackage(locked.atom, pkg.package);
    assert.equal(validated.ok, true);
  });
});
