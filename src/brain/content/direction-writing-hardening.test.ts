import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  buildDirectionWritingContext,
  framingStrategyForObjective,
  type SelectedTopicContext,
} from "./direction-writing-context";
import { generateContentDirectionsBundle } from "./generate-content-directions";
import type { ContentBrainContext } from "./types";

type FixtureFile = {
  id: string;
  brandContext: ContentBrainContext;
  selectedTopic: SelectedTopicContext;
  absentCapability: string;
  awkwardMasterTitle: string;
};

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const v of Object.values(value as object)) {
      if (v && typeof v === "object" && !Object.isFrozen(v)) {
        deepFreeze(v);
      }
    }
  }
  return value;
}

function loadFixture(name: string): FixtureFile {
  const p = path.join(
    process.cwd(),
    "src/brain/content/__fixtures__/direction-writing",
    name
  );
  return JSON.parse(readFileSync(p, "utf8")) as FixtureFile;
}

const FIXTURES = [
  "supplement-comparison.json",
  "professional-service.json",
  "software-product.json",
] as const;

describe("direction-writing-context", () => {
  it("maps TopicCategoryId to framingStrategy structurally", () => {
    assert.equal(
      framingStrategyForObjective("product_education"),
      "education_process"
    );
    assert.equal(
      framingStrategyForObjective("offers_conversion"),
      "value_differentiation"
    );
    assert.equal(
      framingStrategyForObjective("customer_questions"),
      "decision_criteria"
    );
    assert.equal(
      framingStrategyForObjective("trust_proof"),
      "trust_credibility"
    );
  });

  it("preserves masterTopic byte-for-byte including punctuation", () => {
    const fx = loadFixture("software-product.json");
    const title = fx.awkwardMasterTitle;
    const selected: SelectedTopicContext = {
      ...fx.selectedTopic,
      masterTitle: title,
    };
    const writing = buildDirectionWritingContext({
      selected,
      context: fx.brandContext,
    });
    assert.equal(writing.masterTopic, title);
    assert.notEqual(writing.topicSubject, title);
  });
});

describe("hardened deterministic directions (multi-category fixtures)", () => {
  for (const file of FIXTURES) {
    it(`${file}: six angles, exact master, no awkward about-How patterns`, async () => {
      const fx = loadFixture(file);
      const selected = deepFreeze({ ...fx.selectedTopic });
      const writing = deepFreeze(
        buildDirectionWritingContext({
          selected,
          context: fx.brandContext,
        })
      );
      const originalMaster = selected.masterTitle;

      const bundle = await generateContentDirectionsBundle({
        context: fx.brandContext,
        mode: "manual",
        selectedTopicContext: selected,
        topicCategory: selected.objective,
        directionsProvider: "deterministic-v1",
      });

      assert.equal(selected.masterTitle, originalMaster);
      assert.equal(writing.masterTopic, originalMaster);
      assert.ok(
        bundle.result.status === "ready" ||
          bundle.result.status === "partially_ready"
      );
      if (
        bundle.result.status !== "ready" &&
        bundle.result.status !== "partially_ready"
      ) {
        return;
      }

      assert.equal(bundle.result.masterTopic.punchline, originalMaster);
      assert.equal(bundle.writingContext?.framingStrategy, writing.framingStrategy);
      assert.equal(bundle.result.variations.length, 6);
      assert.equal(
        new Set(bundle.result.variations.map((v) => v.angle)).size,
        6
      );

      for (const v of bundle.result.variations) {
        const blob = [
          v.punchline,
          v.subheading,
          v.brief,
          v.ideaSummary,
          v.specificTopic,
          v.audienceProblem,
        ].join(" ");
        assert.equal(/\babout (How|Why|What)\b/i.test(blob), false);
        assert.equal(
          blob.includes(fx.absentCapability),
          false,
          `must not invent absent capability: ${fx.absentCapability}`
        );
      }

      // Full master should not appear in every punchline
      const punchlinesWithFullMaster = bundle.result.variations.filter((v) =>
        v.punchline.includes(originalMaster)
      );
      assert.ok(punchlinesWithFullMaster.length <= 1);
    });
  }

  it("product_education vs offers_conversion select different framingStrategy", async () => {
    const fx = loadFixture("supplement-comparison.json");
    const edu: SelectedTopicContext = {
      ...fx.selectedTopic,
      objective: "product_education",
    };
    const val: SelectedTopicContext = {
      ...fx.selectedTopic,
      objective: "offers_conversion",
    };
    const eduBundle = await generateContentDirectionsBundle({
      context: fx.brandContext,
      mode: "manual",
      selectedTopicContext: edu,
      topicCategory: "product_education",
    });
    const valBundle = await generateContentDirectionsBundle({
      context: fx.brandContext,
      mode: "manual",
      selectedTopicContext: val,
      topicCategory: "offers_conversion",
    });
    assert.equal(eduBundle.writingContext?.framingStrategy, "education_process");
    assert.equal(
      valBundle.writingContext?.framingStrategy,
      "value_differentiation"
    );
    if (
      eduBundle.result.status !== "blocked" &&
      valBundle.result.status !== "blocked"
    ) {
      const eduPurpose = eduBundle.result.variations[0].strategicPurpose;
      const valPurpose = valBundle.result.variations[0].strategicPurpose;
      assert.notEqual(eduPurpose, valPurpose);
      assert.match(eduPurpose, /process|terminology|mistakes/i);
      assert.match(valPurpose, /benefit|difference|outcome/i);
    }
  });

  it("provider source has no hardcoded vertical category literals", () => {
    const src = readFileSync(
      path.join(
        process.cwd(),
        "src/brain/content/providers/deterministic-provider.ts"
      ),
      "utf8"
    );
    assert.equal(/supplements/i.test(src), false);
    assert.equal(/fundraising/i.test(src), false);
    assert.equal(/webhook/i.test(src), false);
  });

  it("production modules do not import direction-writing fixtures", () => {
    const provider = readFileSync(
      path.join(
        process.cwd(),
        "src/brain/content/providers/deterministic-provider.ts"
      ),
      "utf8"
    );
    const writing = readFileSync(
      path.join(process.cwd(), "src/brain/content/direction-writing-context.ts"),
      "utf8"
    );
    assert.equal(provider.includes("__fixtures__/direction-writing"), false);
    assert.equal(writing.includes("__fixtures__/direction-writing"), false);
  });
});
