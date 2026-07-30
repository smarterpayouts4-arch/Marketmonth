import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_TOPIC_CATEGORY_OPTIONS,
  TOPIC_CATEGORY_LABELS,
} from "@/brain/content/topic-category";

import { buildContentDirectionsRequest } from "./build-content-directions-request";
import {
  AUTO_GENERATE_BUTTON_LABEL,
  CONTEXT_HELP_MICROCOPY,
  CONTEXT_TRIGGER_LABEL,
  GENERATE_BUTTON_LABEL,
  LEGACY_MARKETING_TOPIC_HEADING,
  LEGACY_PICK_HEADING,
  TOPIC_CATEGORY_LEGEND,
  MARKETING_TOPIC_HEADING,
  MARKETING_TOPIC_NAV_LABEL,
} from "./copy";
import { emptyExtraContextUi } from "./extra-context-client";

const dir = path.dirname(fileURLToPath(import.meta.url));

function readSrc(name: string): string {
  return readFileSync(path.join(dir, name), "utf8");
}

describe("marketing topic copy + request", () => {
  it("uses create framing, not pick/welcome, and drops legacy month headline", () => {
    assert.equal(
      MARKETING_TOPIC_HEADING,
      "Let's create your first marketing topic"
    );
    assert.notEqual(MARKETING_TOPIC_HEADING, LEGACY_MARKETING_TOPIC_HEADING);
    assert.notEqual(MARKETING_TOPIC_HEADING, LEGACY_PICK_HEADING);
    assert.equal(MARKETING_TOPIC_NAV_LABEL, "Marketing Topic");
    const header = readSrc("marketing-topic-header.tsx");
    const workspace = readSrc("marketing-topic-workspace.tsx");
    const card = readSrc("topic-creation-card.tsx");
    assert.match(header, /MARKETING_TOPIC_HEADING/);
    assert.doesNotMatch(header, /Welcome/);
    assert.doesNotMatch(workspace, /Create Topic/);
    assert.doesNotMatch(card, /Create Topic/);
    assert.equal(GENERATE_BUTTON_LABEL, "Generate");
    assert.equal(AUTO_GENERATE_BUTTON_LABEL, "Auto-generate");
    assert.match(card, /onGenerate/);
    assert.match(card, /onAutoGenerate/);
    assert.match(card, /GENERATE_BUTTON_LABEL/);
    assert.match(card, /AUTO_GENERATE_BUTTON_LABEL/);
  });

  it("keeps the header to the heading only (no support paragraphs)", () => {
    const header = readSrc("marketing-topic-header.tsx");
    assert.match(header, /MARKETING_TOPIC_HEADING/);
    assert.doesNotMatch(header, /MARKETING_TOPIC_SUPPORT|BRAIN_CONTEXT_EXPLAINER/);
    assert.doesNotMatch(header, /proprietary AI|auto-generate one for you/i);
  });

  it("exposes four default topic-category options as single-select values", () => {
    assert.deepEqual(DEFAULT_TOPIC_CATEGORY_OPTIONS, [
      "customer_questions",
      "product_education",
      "trust_proof",
      "offers_conversion",
    ]);
    assert.equal(TOPIC_CATEGORY_LABELS.customer_questions, "Customer Questions");
    assert.equal(TOPIC_CATEGORY_LABELS.product_education, "Product Education");
    assert.equal(TOPIC_CATEGORY_LABELS.trust_proof, "Trust & Proof");
    assert.equal(
      TOPIC_CATEGORY_LABELS.offers_conversion,
      "Offers & Conversion"
    );
    assert.match(TOPIC_CATEGORY_LEGEND, /accomplish/i);
  });

  it("sends topicCategory as a dedicated field (not priorities)", () => {
    const built = buildContentDirectionsRequest({
      domain: "zynava.com",
      mode: "automatic",
      topicCategory: "offers_conversion",
      contextState: emptyExtraContextUi(),
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal(built.body.topicCategory, "offers_conversion");
    assert.equal(built.body.requestedVariations, 6);
    assert.equal(
      Object.prototype.hasOwnProperty.call(built.body, "priorities"),
      false
    );
  });

  it("includes pasted extraContext for manual generation with focus", () => {
    const built = buildContentDirectionsRequest({
      domain: "zynava.com",
      mode: "manual",
      topic: "Clearer homepage offer",
      topicCategory: "product_education",
      contextState: {
        ...emptyExtraContextUi(),
        pastedText: "Feature the starter plan this month",
      },
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal(built.body.mode, "manual");
    assert.equal(built.body.topic, "Clearer homepage offer");
    assert.equal(built.body.topicCategory, "product_education");
    assert.equal(built.body.extraContext?.source, "pasted");
    assert.match(built.body.extraContext?.text ?? "", /starter plan/);
  });

  it("keeps compact context trigger copy and help microcopy", () => {
    assert.equal(CONTEXT_TRIGGER_LABEL, "Add helpful context");
    assert.match(CONTEXT_HELP_MICROCOPY, /Relevant context/);
    const supplemental = readSrc("supplemental-context.tsx");
    assert.doesNotMatch(supplemental, /Add more information/);
    assert.doesNotMatch(supplemental, /Drop a file here/);
    assert.doesNotMatch(supplemental, /Paste notes here/);
  });

  it("puts the master topic in the field and directions below (no side panel)", () => {
    const workspace = readSrc("marketing-topic-workspace.tsx");
    assert.doesNotMatch(workspace, /MasterTopicSideSlot|master-topic-side-slot/);
    assert.doesNotMatch(workspace, /MasterTopicPanel|master-topic-panel/);
    assert.match(workspace, /ContentVariationGrid/);
    assert.match(workspace, /content\?atomId=/);
    assert.match(workspace, /confirmDirectionAndBuildAtom|AtomReviewPanel/);
    for (const file of [
      "topic-creation-card.tsx",
      "marketing-topic-workspace.tsx",
      "supplemental-context.tsx",
    ]) {
      const src = readSrc(file);
      assert.doesNotMatch(src, /topic-context-panel|TopicContextPanel/);
      assert.doesNotMatch(src, /topic-creation-bar|TopicCreationBar/);
      assert.doesNotMatch(src, /Create your social media month/);
    }
  });

  it("selects a direction by click and goes to Content (no footer bar)", () => {
    const workspace = readSrc("marketing-topic-workspace.tsx");
    assert.match(workspace, /handleConfirmDirection|onConfirm/);
    assert.doesNotMatch(workspace, /TopicSelectionFooter|topic-selection-footer/);
    assert.doesNotMatch(workspace, /Continue to Content/);
  });
});
