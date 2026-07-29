/**
 * Golden fixtures for the 3-section social discovery narrative.
 * Zynava (rich) · ClearFlow (other industry) · Thin Signal (degraded).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { parseCompanyCsv } from "@/lib/company-profile/csv-contract";

import { buildDiscoveryNarrative } from "./index";

const SUPPLEMENT_LEAK_RE =
  /\b(supplement|vitamin|magnesium|softgel|gummies|omega-?3|probiotic|bioavailab)\b/i;

const JUNK_RE =
  /@context|schema\.org|application\/ld\+json|<script|neon[_-]?record|candidate[_-]?id|1970-01-01T00:00:00\.000Z/i;

const FORBIDDEN_SOCIAL_RE =
  /\b(no account|not active|unused|missing account|inactive)\b/i;

function loadProjection(relativePath: string) {
  const text = readFileSync(path.join(process.cwd(), relativePath), "utf8");
  return parseCompanyCsv(text);
}

function allNarrativeText(
  narrative: ReturnType<typeof buildDiscoveryNarrative>
): string {
  return [
    narrative.introHeadline,
    narrative.introDescription,
    narrative.finalDirection,
    narrative.investmentQuestion,
    ...narrative.sections.flatMap((s) => [
      s.headline,
      s.subheading,
      s.reveal,
      s.transition ?? "",
      s.socialMeaning ?? "",
      ...s.bullets.map((b) => b.text),
      ...s.bullets.flatMap((b) => b.evidence.map((e) => e.excerpt ?? "")),
    ]),
    ...narrative.contentPillars.map((p) => `${p.name} ${p.description}`),
    ...narrative.platformAdaptations.map((p) => p.guidance),
    narrative.cadence.description,
    ...narrative.cadence.rationale,
    narrative.contentUniversePreview.coreTopic,
    narrative.contentUniversePreview.strategicPurpose,
    ...narrative.contentUniversePreview.pieces.map(
      (p) => `${p.hook} ${p.angle}`
    ),
  ].join("\n");
}

describe("buildDiscoveryNarrative golden fixtures", () => {
  it("Zynava approved.csv → 3 sections, complete evidence, recommended cadence", () => {
    const projection = loadProjection("data/companies/zynava.com/approved.csv");
    const narrative = buildDiscoveryNarrative({ projection });

    assert.equal(narrative.sections.length, 3);
    assert.deepEqual(
      narrative.sections.map((s) => s.id),
      ["doing-well", "win", "content-play"]
    );
    assert.equal(narrative.sections[0]?.label, "What You’re Doing Well");
    assert.equal(narrative.sections[1]?.label, "Where You Can Win");
    assert.equal(narrative.sections[2]?.label, "Your Content Play");

    const texts = allNarrativeText(narrative);
    assert.ok(
      !/\bWe$/.test(texts) && !/multiple\s*\./i.test(texts),
      "must prefer complete description over clipped brand_profile.description"
    );
    assert.ok(!JUNK_RE.test(texts), "must not leak schema/JSON/placeholder junk");

    for (const section of narrative.sections) {
      assert.ok(section.bullets.length >= 1);
      for (const bullet of section.bullets) {
        assert.ok(
          bullet.evidence.length >= 1,
          `bullet in ${section.id} needs evidence`
        );
        assert.ok(
          ["observed", "inferred", "recommended"].includes(bullet.classification)
        );
      }
    }

    assert.equal(narrative.cadence.classification, "recommended");
    assert.ok(
      ["light", "consistent", "active", "daily"].includes(narrative.cadence.level)
    );
    // Rich inventory should not hardcode a single brand cadence — Zynava lands consistent.
    assert.equal(narrative.cadence.level, "consistent");
    assert.match(
      narrative.cadence.description,
      /recommended by Market Month/i
    );

    for (const ch of narrative.detectedChannels) {
      assert.ok(
        ch.status === "link-detected" || ch.status === "link-not-detected"
      );
    }
    const detected = narrative.detectedChannels.filter(
      (c) => c.status === "link-detected"
    );
    assert.ok(detected.some((c) => c.platform === "facebook"));
    assert.ok(detected.some((c) => c.platform === "linkedin"));
    assert.ok(detected.some((c) => c.platform === "youtube"));

    assert.ok(!FORBIDDEN_SOCIAL_RE.test(texts));
    assert.ok(narrative.contentPillars.length >= 3);
    for (const pillar of narrative.contentPillars) {
      assert.ok(pillar.name.trim().length > 0);
      assert.ok(pillar.evidence.length >= 1);
    }
    assert.equal(narrative.evidenceQuality, "strong");
  });

  it("ClearFlow plumbing → industry-specific pillars, no supplement leakage", () => {
    const projection = loadProjection(
      "data/companies/clearflow-plumbing/approved.csv"
    );
    const narrative = buildDiscoveryNarrative({ projection });

    assert.deepEqual(
      narrative.sections.map((s) => s.id),
      ["doing-well", "win", "content-play"]
    );
    assert.equal(narrative.businessName, "ClearFlow Plumbing");

    const texts = allNarrativeText(narrative);
    assert.ok(
      !SUPPLEMENT_LEAK_RE.test(texts),
      "plumbing fixture must not emit supplement-shaped language"
    );
    assert.ok(
      /plumb|water heater|drain|homeowner|flat-rate|leak/i.test(texts),
      "must reflect plumbing evidence"
    );

    for (const section of narrative.sections) {
      for (const bullet of section.bullets) {
        assert.ok(bullet.evidence.length >= 1);
      }
    }
    assert.equal(narrative.cadence.classification, "recommended");
    assert.ok(narrative.contentPillars.every((p) => p.name.trim().length > 0));
  });

  it("thin fixture → graceful degradation with light cadence", () => {
    const projection = loadProjection(
      "data/companies/thin-signal.example/approved.csv"
    );
    const narrative = buildDiscoveryNarrative({ projection });

    assert.deepEqual(
      narrative.sections.map((s) => s.id),
      ["doing-well", "win", "content-play"]
    );
    assert.equal(narrative.businessName, "Thin Signal Co");
    assert.equal(narrative.cadence.level, "light");
    assert.equal(narrative.cadence.classification, "recommended");
    assert.equal(narrative.evidenceQuality, "low");

    for (const section of narrative.sections) {
      assert.ok(section.bullets.length >= 1);
      for (const bullet of section.bullets) {
        assert.ok(bullet.evidence.length >= 1);
      }
    }

    const texts = allNarrativeText(narrative);
    assert.ok(!JUNK_RE.test(texts));
    assert.ok(
      narrative.detectedChannels.every((c) => c.status === "link-not-detected")
    );
  });
});
