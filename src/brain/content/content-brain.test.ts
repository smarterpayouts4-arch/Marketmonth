import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { buildEvidenceId, toEvidence } from "./evidence";
import { evaluateAndExpandUserTopic } from "./expand-user-topic";
import {
  EXTRA_CONTEXT_MAX_CHARS,
  validateExtraContext,
  withOwnerConfirmedContext,
} from "./extra-context";
import { generateContentDirections } from "./generate-content-directions";
import {
  buildContentDirectionsHandoff,
  validateContentDirectionsHandoff,
} from "./handoff";
import { parseFixtureCsv } from "./repository/parse-fixture-csv";
import { evaluateSafety } from "./safety";
import type { ContentBrainContext } from "./types";

function loadFixtureContext(): ContentBrainContext {
  const text = readFileSync(
    path.join(process.cwd(), "data/companies/zynava.com/approved.csv"),
    "utf8"
  );
  const ctx = parseFixtureCsv(text);
  assert.ok(ctx, "fixture context should parse");
  return ctx;
}

describe("Content Brain evidence", () => {
  it("builds deterministic evidence ids", () => {
    const a = buildEvidenceId({
      recordType: "brand_profile",
      field: "businessName",
      sourceUrl: "https://zynava.com",
      sourceSnippet: "Zynava",
    });
    const b = buildEvidenceId({
      recordType: "brand_profile",
      field: "businessName",
      sourceUrl: "https://zynava.com",
      sourceSnippet: "Zynava",
    });
    assert.equal(a, b);
    assert.match(a, /^ev_[a-f0-9]{16}$/);
  });

  it("toEvidence is stable across calls", () => {
    const e1 = toEvidence({
      recordType: "brand_profile",
      field: "audience",
      value: "Growth teams",
      sourceUrl: "https://zynava.com",
      sourceSnippet: "Growth",
      confidence: "medium",
    });
    const e2 = toEvidence({
      recordType: "brand_profile",
      field: "audience",
      value: "Growth teams",
      sourceUrl: "https://zynava.com",
      sourceSnippet: "Growth",
      confidence: "medium",
    });
    assert.equal(e1.id, e2.id);
  });
});

describe("Content Brain safety", () => {
  it("allows educational framing", () => {
    const s = evaluateSafety(
      "How to make clearer marketing decisions before choosing a system"
    );
    assert.equal(s.status, "safe");
  });

  it("blocks treatment / cure claims", () => {
    const s = evaluateSafety("This product cures anxiety overnight");
    assert.equal(s.status, "blocked");
  });
});

describe("Content Brain generateContentDirections", () => {
  it("automatic mode returns master + six variations", async () => {
    const context = loadFixtureContext();
    const result = await generateContentDirections({
      context,
      mode: "automatic",
    });
    assert.notEqual(result.status, "blocked");
    if (result.status === "blocked") return;
    assert.equal(result.variations.length, 6);
    assert.equal(result.masterTopic.source, "automatic");
    assert.ok(result.generationId.startsWith("tgen_"));
    for (const v of result.variations) {
      assert.ok(
        (v.ideaSummary?.length ?? 0) >= 180,
        "ideaSummary should be substantive"
      );
    }
    const ids = new Set(result.variations.map((v) => v.id));
    assert.equal(ids.size, 6);
  });

  it("manual mode preserves user topic as master punchline", async () => {
    const context = loadFixtureContext();
    const topic = "How to make better marketing decisions for growth teams";
    const result = await generateContentDirections({
      context,
      mode: "manual",
      topic,
    });
    assert.notEqual(result.status, "blocked");
    if (result.status === "blocked") return;
    assert.equal(result.masterTopic.source, "manual");
    assert.equal(result.masterTopic.punchline, topic);
    assert.equal(result.variations.length, 6);
  });

  it("blocked union has empty variations (not fabricated cards)", async () => {
    const context = loadFixtureContext();
    const result = await generateContentDirections({
      context,
      mode: "manual",
      topic: "cure disease with guaranteed results",
    });
    assert.equal(result.status, "blocked");
    if (result.status !== "blocked") return;
    assert.deepEqual(result.variations, []);
    assert.ok(!("masterTopic" in result));
  });

  it("blocked when core brand fields missing", async () => {
    const context = loadFixtureContext();
    const result = await generateContentDirections({
      context: { ...context, brandName: "", domain: "", website: "" },
      mode: "automatic",
    });
    assert.equal(result.status, "blocked");
    if (result.status !== "blocked") return;
    assert.ok(result.missingFields.includes("brandName"));
    assert.deepEqual(result.variations, []);
  });
});

describe("evaluateAndExpandUserTopic", () => {
  it("rejects empty topic", () => {
    const context = loadFixtureContext();
    const r = evaluateAndExpandUserTopic({ topic: "  ", context });
    assert.equal(r.ok, false);
  });
});

describe("ContentDirectionsHandoffV1", () => {
  it("validates membership and domain; replace selection keeps full set", async () => {
    const context = loadFixtureContext();
    const result = await generateContentDirections({
      context,
      mode: "automatic",
    });
    assert.notEqual(result.status, "blocked");
    if (result.status === "blocked") return;

    const first = result.variations[0].id;
    const second = result.variations[1].id;

    const h1 = buildContentDirectionsHandoff({
      result,
      selectedVariationId: first,
      brandDomain: context.domain,
    });
    assert.equal(h1.ok, true);
    if (!h1.ok) return;

    // Selecting a different card replaces selection — no second id stored
    const h2 = buildContentDirectionsHandoff({
      result,
      selectedVariationId: second,
      brandDomain: context.domain,
    });
    assert.equal(h2.ok, true);
    if (!h2.ok) return;
    assert.equal(h2.handoff.selectedVariationId, second);
    assert.equal(h2.handoff.variations.length, 6);
    assert.equal(h2.handoff.generationId, result.generationId);

    const validated = validateContentDirectionsHandoff(
      h2.handoff,
      context.domain
    );
    assert.equal(validated.ok, true);

    const badDomain = validateContentDirectionsHandoff(
      h2.handoff,
      "other-brand.com"
    );
    assert.equal(badDomain.ok, false);

    const badMember = buildContentDirectionsHandoff({
      result,
      selectedVariationId: "not-a-real-id",
      brandDomain: context.domain,
    });
    assert.equal(badMember.ok, false);
  });
});

describe("extraContext owner-confirmed", () => {
  it("rejects oversized context without truncating", () => {
    const huge = "x".repeat(EXTRA_CONTEXT_MAX_CHARS + 1);
    const v = validateExtraContext({
      text: huge,
      source: "pasted",
    });
    assert.equal(v.ok, false);
  });

  it("accepts paste-only, file-only, and combined", () => {
    assert.equal(
      validateExtraContext({ text: "notes", source: "pasted" }).ok,
      true
    );
    assert.equal(
      validateExtraContext({
        text: "from file",
        source: "uploaded_file",
        filenames: ["brief.md"],
      }).ok,
      true
    );
    assert.equal(
      validateExtraContext({
        text: "a\n\nb",
        source: "combined",
        filenames: ["a.txt", "b.md"],
      }).ok,
      true
    );
  });

  it("rejects unsupported filenames", () => {
    const v = validateExtraContext({
      text: "x",
      source: "uploaded_file",
      filenames: ["deck.pdf"],
    });
    assert.equal(v.ok, false);
  });

  it("maps onto ownerConfirmed without creating evidence ids", async () => {
    const context = loadFixtureContext();
    const beforeIds = Object.keys(context.evidenceById);
    const enriched = withOwnerConfirmedContext(context, {
      text: "Owner note about Q3 offer clarity",
      source: "pasted",
    });
    assert.ok(enriched.ownerConfirmed);
    assert.equal(
      enriched.ownerConfirmed?.text,
      "Owner note about Q3 offer clarity"
    );
    assert.deepEqual(Object.keys(enriched.evidenceById), beforeIds);

    const result = await generateContentDirections({
      context,
      mode: "automatic",
      extraContext: {
        text: "Owner note about Q3 offer clarity",
        source: "pasted",
      },
    });
    assert.notEqual(result.status, "blocked");
  });

  it("applies marketingFocus without inventing evidence ids", async () => {
    const context = loadFixtureContext();
    const beforeIds = Object.keys(context.evidenceById);
    const result = await generateContentDirections({
      context,
      mode: "automatic",
      marketingFocus: "value_proposition",
    });
    assert.notEqual(result.status, "blocked");
    if (result.status === "blocked") return;
    assert.deepEqual(Object.keys(context.evidenceById), beforeIds);
    // value_proposition → value_differentiation framing (see direction-writing-context)
    assert.ok(
      result.variations.every((v) =>
        v.strategicPurpose.includes("benefit, difference")
      )
    );
  });
});
