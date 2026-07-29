import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";

import {
  getIdeaLabHistoryPath,
  labHistoryRecordCount,
  listIdeaLabRuns,
  resetIdeaLabTopicHistory,
} from "@/brain/evaluation/idea-lab-store";
import {
  IDEA_LAB_GENERATOR_VERSION,
  IDEA_LAB_PROVIDER_ID,
} from "@/brain/evaluation/idea-lab.types";
import { TOPIC_OBJECTIVE_REQUIRED } from "@/brain/evaluation/topic-candidate-types";
import {
  averageScores,
  overallAverage,
  type IdeaQualityScores,
} from "@/brain/evaluation/idea-quality.schema";
import {
  inspectIdeaLabFixture,
  runIdeaLabDirections,
} from "@/brain/use-cases/run-idea-lab-directions";
import { runIdeaLabTopicCandidates } from "@/brain/use-cases/run-idea-lab-topic-candidates";
import { topicHistoryCsvPath } from "@/brain/store/paths";

const EMPTY_SCORES: IdeaQualityScores = {
  csv_relevance: 4,
  brand_alignment: 3,
  audience_relevance: 5,
  specificity: 2,
  originality: 3,
  usefulness: 4,
  distinctness: 3,
  evidence_grounding: 2,
  clarity: 4,
  would_create: 3,
};

describe("Idea Lab evaluation helpers", () => {
  it("averages scores across dimensions", () => {
    assert.equal(averageScores(EMPTY_SCORES), 3.3);
  });

  it("overallAverage returns null for empty list", () => {
    assert.equal(overallAverage([]), null);
  });
});

describe("Idea Lab use case (deterministic-v1)", () => {
  let productHistoryBefore: string | null;

  before(() => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Idea Lab tests must not run with NODE_ENV=production");
    }
    resetIdeaLabTopicHistory();
    const productPath = topicHistoryCsvPath();
    if (existsSync(productPath)) {
      productHistoryBefore = readFileSync(productPath, "utf8");
    } else {
      productHistoryBefore = null;
    }
  });

  after(() => {
    resetIdeaLabTopicHistory();
  });

  it("inspect reports active deterministic-v1 and Lab history path", () => {
    const inspect = inspectIdeaLabFixture();
    assert.equal(inspect.parseError, null);
    assert.ok(inspect.fixtureHash.length >= 8);
    assert.ok(inspect.rowCount > 0);
    assert.ok(inspect.brandCoreId);
    assert.equal(
      inspect.historyRepositoryPath,
      getIdeaLabHistoryPath()
    );
    assert.ok(
      inspect.providerStatus.some(
        (p) => p.id === IDEA_LAB_PROVIDER_ID && p.status === "active"
      )
    );
    assert.ok(
      inspect.providerStatus.some(
        (p) =>
          p.id === "intelligent-v1" &&
          p.status === "unavailable_for_lab_baseline"
      )
    );
  });

  it("rejects candidates without objective", async () => {
    const outcome = await runIdeaLabTopicCandidates({
      companyId: "zynava.com",
    });
    assert.equal(outcome.ok, false);
    if (!outcome.ok) {
      assert.equal(outcome.code, TOPIC_OBJECTIVE_REQUIRED);
    }
    assert.equal(labHistoryRecordCount(), 0);
  });

  it("auto directions path is blocked (candidates-first)", async () => {
    const before = labHistoryRecordCount();
    const run = await runIdeaLabDirections({
      companyId: "zynava.com",
      topicMode: "auto",
    });
    assert.equal(run.generationSucceeded, false);
    assert.equal(run.generation.ideas.length, 0);
    assert.equal(labHistoryRecordCount(), before);
  });

  it("candidates: offers_conversion succeeds without history write (honesty over padding)", async () => {
    resetIdeaLabTopicHistory();
    assert.equal(labHistoryRecordCount(), 0);

    const outcome = await runIdeaLabTopicCandidates({
      companyId: "zynava.com",
      topicCategory: "offers_conversion",
    });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;

    const { result } = outcome;
    assert.equal(result.historyWritten, false);
    assert.equal(result.generation.status, "success");
    if (result.generation.status !== "success") return;
    // Observed-only evidence may yield limited rather than a padded complete six.
    assert.ok(
      result.generation.completeness === "complete" ||
        result.generation.completeness === "limited"
    );
    assert.ok(result.candidates.length >= 1);
    if (result.generation.completeness === "complete") {
      assert.equal(result.candidates.length, 6);
    }
    assert.equal(result.objective, "offers_conversion");
    assert.equal(result.candidates[0].recommended, true);
    assert.equal(result.candidates[0].rank, 1);
    for (const [i, c] of result.candidates.entries()) {
      assert.equal(c.rank, i + 1);
      assert.ok(c.title.trim().length > 0);
      assert.equal(c.objective, "offers_conversion");
      assert.equal(c.scoreVersion, "topic-candidate-score-v2");
      assert.equal(/marketing os/i.test(c.title), false);
      assert.equal(/clarify lead offer/i.test(c.title), false);
      assert.equal(/content planning/i.test(c.title), false);
      assert.equal(
        c.title.toLowerCase().startsWith("how to make clearer marketing decisions"),
        false
      );
      assert.ok(c.evidenceIds.length > 0, "candidate must cite observed evidence");
    }
    assert.equal(labHistoryRecordCount(), 0);
  });

  it("product_education does not write history and avoids platform-as-education", async () => {
    resetIdeaLabTopicHistory();
    const edu = await runIdeaLabTopicCandidates({
      companyId: "zynava.com",
      topicCategory: "product_education",
    });
    assert.equal(edu.ok, true);
    if (!edu.ok) return;
    assert.equal(edu.result.historyWritten, false);
    assert.equal(labHistoryRecordCount(), 0);
    if (edu.result.generation.status === "insufficient_context") {
      assert.equal(edu.result.candidates.length, 0);
      return;
    }
    assert.equal(edu.result.generation.status, "success");
    for (const c of edu.result.candidates) {
      assert.notEqual(c.subjectKind, "platform_capability");
      assert.equal(/how to evaluate supplement search/i.test(c.title), false);
    }
    if (edu.result.generation.completeness === "limited") {
      assert.ok(edu.result.candidates.length <= 5);
      assert.ok(edu.result.warnings.length >= 1);
    }
  });

  it("product_education and offers_conversion yield different topic families", async () => {
    const edu = await runIdeaLabTopicCandidates({
      companyId: "zynava.com",
      topicCategory: "product_education",
    });
    const val = await runIdeaLabTopicCandidates({
      companyId: "zynava.com",
      topicCategory: "offers_conversion",
    });
    assert.equal(edu.ok, true);
    assert.equal(val.ok, true);
    if (!edu.ok || !val.ok) return;
    const eduTitles = new Set(
      edu.result.candidates.map((c) => c.title.toLowerCase())
    );
    const overlap = val.result.candidates.filter((c) =>
      eduTitles.has(c.title.toLowerCase())
    );
    assert.ok(overlap.length <= 1);
  });

  it("select topic → six unique ideas + Lab history + honest provenance", async () => {
    resetIdeaLabTopicHistory();
    const cand = await runIdeaLabTopicCandidates({
      companyId: "zynava.com",
      topicCategory: "product_education",
    });
    assert.equal(cand.ok, true);
    if (!cand.ok) return;
    const selected = cand.result.candidates[0];
    assert.ok(selected, "expected at least one product_education candidate");

    const run = await runIdeaLabDirections({
      companyId: "zynava.com",
      topicMode: "manual",
      topicCategory: "product_education",
      selectedTopicContext: {
        topicId: selected.topicId,
        masterTitle: selected.title,
        objective: "product_education",
        audience: selected.audience,
        audiencePain: selected.audiencePain,
        strategicAngle: selected.strategicAngle,
        relevanceReasons: selected.relevanceReasons,
        evidenceIds: selected.evidenceIds,
        subjectLabel: selected.subject?.label,
      },
    });

    assert.equal(run.input.providerRequested, IDEA_LAB_PROVIDER_ID);
    assert.equal(run.input.providerUsed, IDEA_LAB_PROVIDER_ID);
    assert.equal(run.input.generatorVersion, IDEA_LAB_GENERATOR_VERSION);
    assert.equal(run.input.generatorVersion, "deterministic-directions-v2");
    assert.equal(run.input.model, null);
    assert.equal(run.input.promptVersion, null);
    assert.equal(run.brandCoreSummary.usedAsPrimaryIdeaInput, true);
    assert.equal(run.generationSucceeded, true);
    assert.equal(run.historyPersisted, true);
    assert.equal(run.generation.masterTopic, selected.title);
    assert.equal(run.generation.ideas.length, 6);
    assert.ok(run.directionLineage);
    assert.ok(
      run.directionLineage?.framingStrategy,
      "expected a framing strategy from the selected objective"
    );
    assert.equal(
      run.directionLineage?.writingContextVersion,
      "direction-writing-context-v1"
    );
    for (const idea of run.generation.ideas) {
      const blob = `${idea.punchline} ${idea.ideaSummary ?? ""} ${idea.specificTopic ?? ""}`;
      assert.equal(/\babout (How|Why|What)\b/i.test(blob), false);
    }

    const ids = run.generation.ideas.map((i) => i.id);
    assert.equal(new Set(ids).size, 6);

    assert.ok(run.trace.length >= 1);
    assert.ok(
      run.trace.some((t) => /BrandCore|Brand Core/i.test(t.stage ?? ""))
    );
    assert.ok(
      run.influence.some(
        (i) => i.origin === "brand_core_compiled_not_consumed"
      )
    );

    assert.equal(
      "atomId" in run || "packageId" in run || "channel" in run,
      false
    );

    assert.ok(labHistoryRecordCount() >= 1);
  });

  it("directions without objective is rejected and does not write history", async () => {
    resetIdeaLabTopicHistory();
    const run = await runIdeaLabDirections({
      topicMode: "manual",
      manualTopic: "A concrete selected topic",
    });
    assert.equal(run.generationSucceeded, false);
    assert.ok(run.errors.includes(TOPIC_OBJECTIVE_REQUIRED));
    assert.equal(labHistoryRecordCount(), 0);
  });

  it("does not mutate product topic history", () => {
    const productPath = topicHistoryCsvPath();
    if (productHistoryBefore === null) {
      assert.equal(existsSync(productPath), false);
      return;
    }
    assert.equal(readFileSync(productPath, "utf8"), productHistoryBefore);
  });

  it("history-aware second directions run still uses Lab history path only", async () => {
    // Ensure at least one Lab history row exists for this assertion.
    if (labHistoryRecordCount() === 0) {
      const seed = await runIdeaLabDirections({
        companyId: "zynava.com",
        topicMode: "manual",
        manualTopic: "Seed Lab directions topic",
        topicCategory: "offers_conversion",
      });
      assert.equal(seed.generationSucceeded, true);
    }
    const beforeCount = labHistoryRecordCount();
    assert.ok(beforeCount >= 1);

    const run = await runIdeaLabDirections({
      companyId: "zynava.com",
      topicMode: "manual",
      manualTopic: "Second Lab directions topic for novelty",
      topicCategory: "offers_conversion",
    });
    assert.equal(run.input.labHistoryRecordCountBefore, beforeCount);
    assert.equal(run.input.historyRepositoryPath, getIdeaLabHistoryPath());
    assert.equal(run.generation.ideas.length, 6);
    assert.ok(labHistoryRecordCount() > beforeCount);

    const productPath = topicHistoryCsvPath();
    if (productHistoryBefore !== null) {
      assert.equal(readFileSync(productPath, "utf8"), productHistoryBefore);
    }
  });

  it("Reset Lab History clears Lab CSV only", () => {
    assert.ok(labHistoryRecordCount() >= 1);
    resetIdeaLabTopicHistory();
    assert.equal(labHistoryRecordCount(), 0);
    assert.ok(existsSync(getIdeaLabHistoryPath()));
    assert.equal(readFileSync(getIdeaLabHistoryPath(), "utf8").trim(), "");

    const runsPromise = listIdeaLabRuns();
    return runsPromise.then((runs) => {
      assert.ok(Array.isArray(runs));
    });
  });

  it("refuses directions when CSV shape is invalid", async () => {
    const badPath = getIdeaLabHistoryPath().replace(
      "idea-lab-topic-history.csv",
      "idea-lab-bad-fixture.csv"
    );
    writeFileSync(
      badPath,
      "record_type,field,value\nbrand_profile,name,X,extra\n",
      "utf8"
    );
    const run = await runIdeaLabDirections({
      companyId: "zynava.com",
      topicMode: "manual",
      manualTopic: "Any topic",
      topicCategory: "product_education",
      fixturePath: badPath,
    });
    assert.equal(run.generationSucceeded, false);
    assert.ok(run.errors.some((e) => /row|cells|expected/i.test(e)));
    assert.equal(run.generation.ideas.length, 0);
  });
});
