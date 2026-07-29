import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SocialDiscoveryProfile } from "@/lib/discovery/discovery-narrative.schema";

import {
  conciseSummary,
  sourceLabelFromUrl,
  toEvidenceItems,
} from "./to-evidence-items";

const section: SocialDiscoveryProfile["sections"][0] = {
  id: "doing-well",
  label: "What You’re Doing Well",
  subheading: "Business strength",
  headline: "You already have a repeatable story worth sharing.",
  bullets: [
    {
      text: "Acme helps customers with a clear offer: Choose by ingredient, form, and budget.",
      classification: "observed",
      evidence: [
        {
          field: "valueProposition",
          sourceUrl: "https://example.com/about",
          evidenceType: "observed",
          confidence: "high",
          excerpt: "Choose by ingredient, form, and budget with transparent guidance.",
        },
      ],
    },
    {
      text: "Trust signals on the site - independence and transparency - give social content a credible base.",
      classification: "observed",
      evidence: [
        {
          field: "faq",
          sourceUrl: "https://example.com/faq",
          evidenceType: "observed",
          confidence: "high",
          excerpt: "We are committed to transparency and independence.",
        },
      ],
    },
  ],
  reveal: "Clarity is the foundation.",
  transition: "Next, where you can win.",
};

describe("toEvidenceItems", () => {
  it("builds compact accordion rows with readable source labels", () => {
    const items = toEvidenceItems(section);
    assert.equal(items.length, 2);
    assert.ok(items[0]?.title);
    assert.ok(items[0]?.summary.length > 0);
    assert.equal(items[0]?.sourceLabel, "About page");
    assert.equal(items[1]?.sourceLabel, "FAQ");
    assert.ok(!items[0]?.detail?.includes("{"));
  });

  it("omits the detail row when it would repeat the summary", () => {
    const items = toEvidenceItems(section);
    // Bullet 2 has no colon prefix, so summary and detail are the same text.
    assert.equal(items[1]?.detail, undefined);
    // Bullet 1 carries the "Acme helps customers…" prefix worth showing.
    assert.ok(items[0]?.detail?.startsWith("Acme helps customers"));
  });

  it("gives each row in a section a distinct title", () => {
    const titles = toEvidenceItems(section).map((i) => i.title);
    assert.equal(new Set(titles).size, titles.length);
  });

  it("does not repeat the summary inside the supporting points", () => {
    for (const item of toEvidenceItems(section)) {
      const summaryKey = item.summary.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      for (const point of item.supportingPoints) {
        const pointKey = point.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        assert.notEqual(pointKey, summaryKey);
      }
    }
  });

  it("maps common paths to friendly source labels", () => {
    assert.equal(sourceLabelFromUrl("https://x.com/"), "Home page");
    assert.equal(sourceLabelFromUrl("https://x.com/faq"), "FAQ");
    assert.equal(
      sourceLabelFromUrl("https://x.com/supplements/catalog"),
      "Product catalog"
    );
  });

  it("summarizes without mid-sentence ellipsis clips", () => {
    const summary = conciseSummary(
      "Licensed plumbers arrive with transparent flat-rate pricing before work starts."
    );
    assert.ok(!summary.includes("…"));
    assert.ok(summary.endsWith("."));
  });
});
