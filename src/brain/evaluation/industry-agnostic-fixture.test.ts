/**
 * Measurement harness: non-supplement CSV → Brand Core → topic candidates.
 * Flags industry-specific leakage (supplement / vitamin / etc.) so de-hardcoding
 * can target real corruptions rather than every literal.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import { compileBrandCore } from "@/brain/core/compile-brand-core";
import type { TopicCategoryId } from "@/brain/content/topic-category";
import { TOPIC_CATEGORY_IDS } from "@/brain/content/topic-category";

import { contentOpportunitiesForCatalog } from "@/engine/discovery/extract-catalog-names/content-opportunities";

import { generateTopicCandidates } from "./generate-topic-candidates";
import { classifyContextSubjects } from "./topic-subject";

const FIXTURE_RELATIVE =
  "data/companies/clearflow-plumbing/approved.csv" as const;

/** Industry vocabulary that must not appear in output for a plumbing brand. */
const LEAKAGE_RE =
  /\b(supplement|supplements|vitamin|vitamins|magnesium|glycinate|price per serving|softgel|gummies|bioavailab|nutrient|dosage|capsule|methylcobalamin|cyanocobalamin|ashwagandha|creatine|omega-?3|probiotic)\b/i;

/**
 * Retail shopping shells that must not frame titles for a non-retail brand
 * unless grounded in a comparison attribute (ClearFlow has none).
 */
const RETAIL_SHELL_RE =
  /\b(label check|check the label|before you buy|the longer you shop|serving size|comparison trap before you buy)\b/i;

type LeakHit = {
  objective: TopicCategoryId;
  where: "title" | "audiencePain" | "strategicAngle" | "relevanceReason" | "subjectLabel";
  text: string;
  match: string;
};

function loadClearflowContext() {
  const text = readFileSync(
    path.join(process.cwd(), FIXTURE_RELATIVE),
    "utf8"
  );
  const ctx = parseFixtureCsv(text);
  assert.ok(ctx, "clearflow fixture must parse");
  assert.equal(ctx.brandName, "ClearFlow Plumbing");
  assert.equal(ctx.domain, "clearflowplumbing.example");
  const contentBlob = [
    ctx.brandName,
    ctx.description,
    ctx.audience,
    ctx.valueProposition,
    ctx.brandVoice,
    ctx.marketingOpportunity,
    ...(ctx.products ?? []),
    ...(ctx.services ?? []),
    ...(ctx.contentOpportunities ?? []),
    ...(ctx.indexedProducts ?? []).map((p) => p.name),
  ].join(" ");
  assert.ok(
    !LEAKAGE_RE.test(contentBlob),
    "fixture brand content must not contain supplement vocabulary"
  );
  return ctx;
}

function collectLeaks(
  objective: TopicCategoryId,
  result: ReturnType<typeof generateTopicCandidates>
): LeakHit[] {
  const hits: LeakHit[] = [];
  if (result.status !== "success") return hits;
  for (const c of result.candidates) {
    for (const [where, text] of [
      ["title", c.title],
      ["audiencePain", c.audiencePain],
      ["strategicAngle", c.strategicAngle],
      ["subjectLabel", c.subject.label],
    ] as const) {
      const m = text.match(LEAKAGE_RE);
      if (m) hits.push({ objective, where, text, match: m[0] });
    }
    for (const reason of c.relevanceReasons) {
      const m = reason.match(LEAKAGE_RE);
      if (m) {
        hits.push({
          objective,
          where: "relevanceReason",
          text: reason,
          match: m[0],
        });
      }
    }
  }
  return hits;
}

describe("industry-agnostic clearflow fixture measurement", () => {
  it("parses, compiles Brand Core, and records leakage across objectives", () => {
    const context = loadClearflowContext();
    const brandCore = compileBrandCore(context);
    assert.equal(brandCore.brand_name, "ClearFlow Plumbing");
    assert.ok(brandCore.indexed_products.length >= 4);

    const subjects = classifyContextSubjects(context);
    assert.ok(subjects.length >= 4, "expected multiple typed subjects");

    const allLeaks: LeakHit[] = [];
    const report: {
      fixture: string;
      brandName: string;
      subjectKinds: Record<string, number>;
      byObjective: Record<
        string,
        {
          status: string;
          completeness?: string;
          candidateCount: number;
          titles: string[];
          leaks: LeakHit[];
        }
      >;
      totalLeaks: number;
      measuredAt: string;
    } = {
      fixture: FIXTURE_RELATIVE,
      brandName: context.brandName,
      subjectKinds: {},
      byObjective: {},
      totalLeaks: 0,
      measuredAt: new Date().toISOString(),
    };

    for (const s of subjects) {
      report.subjectKinds[s.kind] = (report.subjectKinds[s.kind] ?? 0) + 1;
    }

    for (const objective of TOPIC_CATEGORY_IDS) {
      const result = generateTopicCandidates({
        context,
        objective,
        includeIndustryResearch: false,
      });
      const leaks = collectLeaks(objective, result);
      allLeaks.push(...leaks);
      report.byObjective[objective] = {
        status: result.status,
        completeness:
          result.status === "success" ? result.completeness : undefined,
        candidateCount:
          result.status === "success" ? result.candidates.length : 0,
        titles:
          result.status === "success"
            ? result.candidates.map((c) => c.title)
            : [],
        leaks,
      };
    }

    report.totalLeaks = allLeaks.length;

    // Discovery-side: contentOpportunitiesForCatalog must not inject
    // supplement shopping language for a plumbing catalog.
    const discoveryTopics = contentOpportunitiesForCatalog(
      (context.indexedProducts ?? []).map((p) => ({
        name: p.name,
        sourceUrl: p.sourceUrl ?? "",
      }))
    );
    const discoveryLeaks = discoveryTopics.filter((t) => LEAKAGE_RE.test(t));

    const measurement = {
      ...report,
      discoveryContentOpportunities: discoveryTopics,
      discoveryLeaks,
      findings: {
        brainPathCleanOnSanitizedCsv: report.totalLeaks === 0,
        discoveryInjectsIndustryLanguage: discoveryLeaks.length > 0,
        note:
          discoveryLeaks.length > 0
            ? "contentOpportunitiesForCatalog fallback uses 'labels and price per serving' for any catalog name — primary de-hardcode target."
            : "No discovery injection detected for this catalog.",
      },
    };

    const outDir = path.join(process.cwd(), "data/fixtures");
    mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, "industry-agnostic-measurement.json");
    writeFileSync(outPath, `${JSON.stringify(measurement, null, 2)}\n`, "utf8");

    console.log(
      `[industry-agnostic] wrote ${outPath} topicLeaks=${report.totalLeaks} discoveryLeaks=${discoveryLeaks.length}`
    );
    if (discoveryLeaks.length > 0) {
      console.log(
        "[industry-agnostic] discovery leak samples:",
        discoveryLeaks.slice(0, 3).join(" | ")
      );
    }

    const anySuccess = Object.values(report.byObjective).some(
      (o) => o.status === "success" && o.candidateCount > 0
    );
    assert.ok(anySuccess, "expected at least one objective with candidates");

    const titleLeaks = allLeaks.filter((h) => h.where === "title");
    assert.equal(
      titleLeaks.length,
      0,
      `titles must not mention supplement industry terms: ${JSON.stringify(titleLeaks)}`
    );

    // Retail-shell gate: deterministic title-hook shells must stay
    // industry-neutral for a plumbing brand with no comparison attributes.
    const retailShellLeaks = Object.entries(report.byObjective).flatMap(
      ([objective, o]) =>
        o.titles
          .filter((t) => RETAIL_SHELL_RE.test(t))
          .map((t) => ({ objective, title: t }))
    );
    assert.equal(
      retailShellLeaks.length,
      0,
      `titles must not use retail shopping shells: ${JSON.stringify(retailShellLeaks)}`
    );

    // After de-hardcode: discovery must not inject industry vocabulary.
    assert.equal(
      discoveryLeaks.length,
      0,
      `discovery contentOpportunities must stay industry-agnostic: ${JSON.stringify(discoveryLeaks)}`
    );
  });
});
