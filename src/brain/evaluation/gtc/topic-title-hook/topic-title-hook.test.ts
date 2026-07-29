import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { MarketingFocus } from "@/brain/content/marketing-focus";

import type { TopicSeed } from "../../objective-topic-strategies";
import {
  isMalformedSubjectLabel,
  normalizeOpportunityLabel,
} from "../../subjects/subject-label";
import type { FramedCandidate } from "../frame-title";
import {
  displayIntentKey,
  groundedSupportKey,
  primarySubjectFamily,
} from "../support-key";
import { applyTopicTitleHooks } from "./apply";
import { displayNoun } from "./display-copy";
import { deterministicHookedTitle } from "./templates";
import { TOPIC_TITLE_HOOK_VERSION } from "./types";
import { validateHookedTitle } from "./validate";

function seed(overrides: Partial<TopicSeed> = {}): TopicSeed {
  return {
    subject: "Magnesium glycinate",
    subjectType: "ingredient_or_component",
    sourceFields: ["products"],
    evidenceIds: ["ev_mg"],
    classificationReason: "test",
    classificationConfidence: "high",
    frameHint: "ingredient_check",
    audienceNeed: "label clarity",
    sourceType: "brand_observed",
    ...overrides,
  };
}

function framed(
  s: TopicSeed,
  title: string,
  objective: MarketingFocus = "product_education"
): FramedCandidate {
  return {
    title,
    strategicAngle: "Ingredient education",
    relevanceReasons: ["Grounded ingredient subject"],
    seed: s,
    objective,
  };
}

const PE_BAN_RE =
  /\b(before you buy|check the label|label check|price per serving|serving size|buying\s+.+\?\s*check this|comparison trap before you buy)\b/i;

describe("normalizeOpportunityLabel", () => {
  it("recovers grounded audience phrase from Help-imperative source", () => {
    const label = normalizeOpportunityLabel(
      "Help overwhelmed shoppers compare supplement prices, ingredients, and brands before they buy"
    );
    assert.ok(label);
    assert.match(label!, /overwhelmed shoppers/i);
    assert.equal(/^(Help|Helping)\b/i.test(label!), false);
  });

  it("returns null for incomplete Help chops (does not invent shoppers)", () => {
    assert.equal(normalizeOpportunityLabel("Help overwhelmed"), null);
    assert.equal(normalizeOpportunityLabel("Helping confused"), null);
  });

  it("rejects incomplete audience fragments and broken phrases", () => {
    assert.equal(isMalformedSubjectLabel("Shoppers comparing"), true);
    assert.equal(
      isMalformedSubjectLabel("supplement prices and formulations in on"),
      true
    );
    assert.equal(normalizeOpportunityLabel("Shoppers comparing"), null);
  });
});

describe("displayNoun casing", () => {
  it("sentence-cases generic ingredients without mutating canonical labels", () => {
    assert.equal(displayNoun("Magnesium", "ingredient_or_component"), "magnesium");
    assert.equal(displayNoun("Zinc", "ingredient_or_component"), "zinc");
    assert.equal(displayNoun("Omega-3", "ingredient_or_component"), "Omega-3");
    assert.equal(displayNoun("Vitamin D3", "ingredient_or_component"), "Vitamin D3");
  });
});

describe("topic-title-hook (Hooked Trigger v2)", () => {
  it("keeps subject noun in hooked titles without banned phrases", () => {
    const s = seed();
    const titles = [0, 1, 2, 3, 4, 5].map((i) =>
      deterministicHookedTitle(
        s,
        "What to know about Magnesium glycinate",
        i,
        undefined,
        "product_education"
      )
    );
    for (const t of titles) {
      if (t.itchType === "passthrough") continue;
      assert.match(t.title.toLowerCase(), /magnesium|glycinate/);
      assert.equal(/\bmost shoppers\b/i.test(t.title), false);
      assert.equal(/\bcheck this\b/i.test(t.title), false);
      assert.equal(/\blabel detail\b/i.test(t.title), false);
      assert.equal(/\bOne supplements\b/i.test(t.title), false);
      assert.equal(/\bOne Magnesium check\b/.test(t.title), false);
      assert.equal(/\bWhy How\b/i.test(t.title), false);
    }
  });

  it("never emits supplements gets without comparing", () => {
    const s = seed({
      subject: "supplements",
      subjectType: "product_category",
      frameHint: "category_education",
    });
    for (let i = 0; i < 8; i++) {
      const hooked = deterministicHookedTitle(
        s,
        "Understanding supplements before you compare options",
        i,
        undefined,
        "product_education"
      );
      assert.equal(/\bWhy supplements gets\b/i.test(hooked.title), false);
      if (/comparing supplements gets/i.test(hooked.title)) {
        assert.match(hooked.title, /Why comparing supplements gets/i);
      }
    }
  });

  it("product education prefers compare/label forms over One-ingredient check", () => {
    const mg = seed({ subject: "Magnesium", subjectType: "ingredient_or_component" });
    const titles = [0, 1, 2, 3, 4, 5].map((i) =>
      deterministicHookedTitle(
        mg,
        "What to know about Magnesium",
        i,
        undefined,
        "product_education"
      )
    );
    assert.equal(
      titles.every((t) => !/\bOne Magnesium check\b/.test(t.title)),
      true
    );
    assert.ok(
      titles.some((t) =>
        /before comparing magnesium|label check|compare/i.test(t.title)
      ),
      "expected PE compare/label shells"
    );
  });

  it("prefers typed comparisonAttribute over generic label detail", () => {
    const s = seed({
      subject: "How to compare Zinc form fairly",
      subjectType: "comparison_attribute",
      frameHint: "attribute_education",
    });
    const hooked = deterministicHookedTitle(
      s,
      "What to know about Zinc form",
      4,
      undefined,
      "product_education"
    );
    if (hooked.itchType !== "passthrough") {
      assert.equal(/\blabel detail\b/i.test(hooked.title), false);
      assert.match(hooked.title.toLowerCase(), /form|zinc|compare/);
    }
  });

  it("price-per-serving passthrough uses grounded payoff", () => {
    const s = seed({
      subject: "price per serving",
      subjectType: "comparison_attribute",
      frameHint: "attribute_education",
    });
    const hooked = deterministicHookedTitle(
      s,
      "Why price per serving matters when comparing supplements",
      0,
      undefined,
      "product_education"
    );
    assert.match(
      hooked.title,
      /Price per serving can change how two options compare/i
    );
  });

  it("brand awareness never emits PE shells for platform_capability / brand_position", () => {
    for (const subjectType of [
      "platform_capability",
      "brand_position",
    ] as const) {
      const s = seed({
        subject:
          subjectType === "platform_capability"
            ? "Supplement search"
            : "Transparent labeling",
        subjectType,
        frameHint: "capability_education",
      });
      for (let i = 0; i < 8; i++) {
        const hooked = deterministicHookedTitle(
          s,
          `Why ${s.subject} matters for Zynava shoppers`,
          i,
          undefined,
          "brand_awareness"
        );
        assert.equal(
          PE_BAN_RE.test(hooked.title),
          false,
          `BA banned PE phrase in: ${hooked.title}`
        );
      }
    }
  });

  it("brand awareness allows comparison_attribute price-per-serving framing", () => {
    const s = seed({
      subject: "price per serving",
      subjectType: "comparison_attribute",
      frameHint: "attribute_education",
    });
    const used = new Set<string>();
    let allowed = false;
    for (let i = 0; i < 8; i++) {
      const hooked = deterministicHookedTitle(
        s,
        "Why price per serving matters when comparing supplements",
        i,
        used,
        "brand_awareness"
      );
      used.add(hooked.title.toLowerCase());
      if (/price per serving/i.test(hooked.title)) {
        allowed = true;
      }
    }
    assert.equal(allowed, true);
  });

  it("never emits Help overwhelmed titles", () => {
    const s = seed({
      subject: "Help overwhelmed shoppers compare prices",
      subjectType: "audience_problem",
    });
    for (let i = 0; i < 6; i++) {
      const hooked = deterministicHookedTitle(
        s,
        "What shoppers should compare across supplement brands",
        i,
        undefined,
        "product_education"
      );
      assert.equal(/\bHelp overwhelmed\b/i.test(hooked.title), false);
    }
  });

  it("never uses One supplements for category nouns", () => {
    const s = seed({
      subject: "supplements",
      subjectType: "product_category",
      frameHint: "category_education",
    });
    for (let i = 0; i < 6; i++) {
      const hooked = deterministicHookedTitle(
        s,
        "Understanding supplements before you compare options",
        i,
        undefined,
        "product_education"
      );
      assert.equal(/\bOne supplements\b/i.test(hooked.title), false);
    }
  });

  it("validate rejects most shoppers, check this, label detail, One Magnesium check", () => {
    const s = seed({ subject: "Zinc" });
    assert.equal(
      validateHookedTitle({
        seed: s,
        framedTitle: "What to check about Zinc",
        hookedTitle: "The Zinc label detail most shoppers skip",
      }).ok,
      false
    );
    assert.equal(
      validateHookedTitle({
        seed: s,
        framedTitle: "What to check about Zinc",
        hookedTitle: "Buying Zinc? Check this form before choosing",
      }).ok,
      false
    );
    assert.equal(
      validateHookedTitle({
        seed: s,
        framedTitle: "What to check about Zinc",
        hookedTitle: "One Magnesium check that makes the comparison clearer",
      }).ok,
      false
    );
    assert.equal(
      validateHookedTitle({
        seed: s,
        framedTitle: "Understanding supplements",
        hookedTitle: "Why supplements gets more confusing the longer you shop",
      }).ok,
      false
    );
  });

  it("fail-closed keeps framed title when subject tokens missing", () => {
    const s = seed({ subject: "Zinc" });
    const check = validateHookedTitle({
      seed: s,
      framedTitle: "What to check about Zinc",
      hookedTitle: "The mystery pill shoppers never notice",
    });
    assert.equal(check.ok, false);
  });

  it("applyTopicTitleHooks sets v2 provenance and does not change support keys", () => {
    const drafts = [
      framed(seed({ subject: "Zinc" }), "What to know about Zinc"),
      framed(seed({ subject: "Omega-3" }), "What to check about Omega-3"),
      framed(
        seed({ subject: "Vitamin D3" }),
        "What shoppers miss about Vitamin D3"
      ),
      framed(
        seed({ subject: "Magnesium glycinate" }),
        "What to know about Magnesium glycinate"
      ),
      framed(
        seed({
          subject: "supplements",
          subjectType: "product_category",
        }),
        "Understanding supplements before you compare options"
      ),
      framed(
        seed({
          subject: "price per serving",
          subjectType: "comparison_attribute",
        }),
        "Why price per serving matters when comparing supplements"
      ),
    ];
    const keysBefore = drafts.map((d) => groundedSupportKey(d.seed));
    const out = applyTopicTitleHooks(drafts);
    const keysAfter = out.map((d) => groundedSupportKey(d.seed));
    assert.deepEqual(keysAfter, keysBefore);

    const titleSet = new Set(out.map((d) => d.title.toLowerCase()));
    assert.equal(titleSet.size, out.length, "no exact duplicate titles");

    for (const d of out) {
      assert.equal(d.titleHook.titleHookVersion, TOPIC_TITLE_HOOK_VERSION);
      assert.equal(TOPIC_TITLE_HOOK_VERSION, "topic-title-hook-v2");
      assert.equal(/\bmost shoppers\b/i.test(d.title), false);
      assert.equal(/\bHelp overwhelmed\b/i.test(d.title), false);
      assert.equal(/\bOne supplements\b/i.test(d.title), false);
      assert.equal(/\blabel detail\b/i.test(d.title), false);
    }
  });

  it("TOPIC_TITLE_HOOK_PROVIDER=off keeps framed titles", () => {
    const prev = process.env.TOPIC_TITLE_HOOK_PROVIDER;
    process.env.TOPIC_TITLE_HOOK_PROVIDER = "off";
    try {
      const draft = framed(
        seed(),
        "What to know about Magnesium glycinate"
      );
      const [out] = applyTopicTitleHooks([draft]);
      assert.equal(out.title, draft.title);
      assert.equal(out.titleHook.itchType, "passthrough");
      assert.equal(out.titleHook.fellBack, false);
    } finally {
      if (prev === undefined) delete process.env.TOPIC_TITLE_HOOK_PROVIDER;
      else process.env.TOPIC_TITLE_HOOK_PROVIDER = prev;
    }
  });
});

describe("displayIntentKey", () => {
  it("collapses magnesium family for generic label checks", () => {
    const a = seed({ subject: "Magnesium", frameHint: "product_guide" });
    const b = seed({
      subject: "Magnesium glycinate",
      frameHint: "attribute_education",
    });
    assert.equal(primarySubjectFamily(a), "magnesium");
    assert.equal(primarySubjectFamily(b), "magnesium");
    assert.equal(displayIntentKey(a), displayIntentKey(b));
    assert.match(displayIntentKey(a), /generic_label_check$/);
    // Different frameHints must not create distinct display intents
    assert.equal(
      displayIntentKey(a),
      "magnesium|generic_label_check"
    );
  });

  it("keeps distinct intents for independently grounded attributes", () => {
    const form = seed({
      subject: "Zinc form comparison",
      subjectType: "comparison_attribute",
    });
    const pps = seed({
      subject: "price per serving",
      subjectType: "comparison_attribute",
    });
    assert.notEqual(displayIntentKey(form), displayIntentKey(pps));
  });

  it("does not change groundedSupportKey formula", () => {
    const s = seed({ subject: "Magnesium glycinate" });
    assert.equal(
      groundedSupportKey(s),
      "ingredient_or_component|magnesium glycinate"
    );
  });
});
