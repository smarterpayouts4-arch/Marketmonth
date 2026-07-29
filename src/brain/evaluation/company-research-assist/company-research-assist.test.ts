import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ContentBrainContext } from "@/brain/content/types";

import { buildPersonalizedResearchPrompt } from "./build-prompt";
import { parseCompanyResearchImport } from "./parse-import";
import { mergeResearchImportIntoContext } from "./to-evidence";
import { COMPANY_RESEARCH_IMPORT_VERSION } from "./types";

const sampleContext = {
  companyName: "Zynava",
  websiteUrl: "https://zynava.com",
  selectedObjective: "product_education",
  knownCategories: ["supplements"],
  knownIndexedProducts: ["Magnesium glycinate"],
  knownCapabilities: ["Supplement search"],
  knownAudiences: [],
  knownCustomerProblems: [],
  knownComparisonAttributes: ["price per serving"],
  knownFaqQuestions: [],
  knownInformationGaps: ["Clear decision checklist for first-time buyers"],
};

describe("company-research-assist v1", () => {
  it("builds a prompt without raw CSV and with allowlisted fields", () => {
    const prompt = buildPersonalizedResearchPrompt(sampleContext);
    assert.match(prompt, /Zynava/);
    assert.match(prompt, /https:\/\/zynava\.com/);
    assert.match(prompt, /product_education/);
    assert.match(prompt, /price per serving/);
    assert.equal(/data\/companies\/[^\s"']*approved\.csv/i.test(prompt), false);
    assert.match(prompt, new RegExp(COMPANY_RESEARCH_IMPORT_VERSION));
    assert.match(prompt, /Do not write topic titles/i);
  });

  it("parses valid JSON and rejects invalid / title-like imports", () => {
    const ok = parseCompanyResearchImport(
      JSON.stringify({
        schemaVersion: COMPANY_RESEARCH_IMPORT_VERSION,
        retrievedAt: "2026-07-27T12:00:00.000Z",
        findings: [
          {
            type: "comparison_attribute",
            label: "price per serving on labels",
            sourceUrl: "https://example.com/a",
            confidence: "medium",
          },
        ],
        unknowns: [],
      })
    );
    assert.equal(ok.ok, true);

    const bad = parseCompanyResearchImport("{not json");
    assert.equal(bad.ok, false);

    const noUrl = parseCompanyResearchImport(
      JSON.stringify({
        schemaVersion: COMPANY_RESEARCH_IMPORT_VERSION,
        retrievedAt: "2026-07-27T12:00:00.000Z",
        findings: [
          {
            type: "audience_problem",
            label: "confused buyers",
            sourceUrl: "not-a-url",
            confidence: "low",
          },
        ],
        unknowns: [],
      })
    );
    assert.equal(noUrl.ok, false);
  });

  it("merges findings into context without promoting catalog_candidate", () => {
    const base: ContentBrainContext = {
      brandName: "Zynava",
      domain: "zynava.com",
      website: "https://zynava.com",
      products: ["Supplement search"],
      services: [],
      indexedProducts: [],
      contentOpportunities: ["Existing opportunity"],
      evidenceById: {},
      contextVersion: "test",
      source: "fixture",
    };
    const parsed = parseCompanyResearchImport(
      JSON.stringify({
        schemaVersion: COMPANY_RESEARCH_IMPORT_VERSION,
        retrievedAt: "2026-07-27T12:00:00.000Z",
        findings: [
          {
            type: "comparison_attribute",
            label: "serving size on labels",
            sourceUrl: "https://example.com/labels",
            confidence: "high",
          },
          {
            type: "catalog_candidate",
            label: "Should Not Become Catalog",
            sourceUrl: "https://thirdparty.com/x",
            confidence: "low",
          },
        ],
        unknowns: ["pricing opacity"],
      })
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const merged = mergeResearchImportIntoContext(base, parsed.value);
    assert.ok(
      merged.contentOpportunities.some((o) => /serving size/i.test(o))
    );
    assert.equal(merged.indexedProducts.length, 0);
    assert.ok(
      Object.values(merged.evidenceById).every(
        (e) => e.recordType === "user_research_import"
      )
    );
  });
});
