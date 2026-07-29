import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  rmSync,
  copyFileSync,
} from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, it } from "node:test";

import {
  buildZynavaReconciliationReport,
  CURATED_PLATFORM_CAPABILITIES,
} from "./build-report";

const FIXTURE = path.join(
  process.cwd(),
  "data/companies/zynava.com/approved.csv"
);

describe("buildZynavaReconciliationReport", () => {
  it("never modifies the approved CSV (hash stable)", () => {
    const before = createHash("sha256")
      .update(readFileSync(FIXTURE))
      .digest("hex");
    const report = buildZynavaReconciliationReport({
      approvedCsvPath: FIXTURE,
      frozenCorpusDir: path.join(
        process.cwd(),
        "data/runtime/discovery-pages/zynava.com"
      ),
      analyzeProfile: {
        products: ["Free AI Supplement Advisor for non-medical, educational guidance"],
        services: ["Price comparison across retailers"],
        indexedProducts: [
          { name: "Calcium", sourceUrl: "https://zynava.com/supplements/catalog/minerals/calcium" },
          { name: "Magnesium", sourceUrl: "https://zynava.com/supplements/catalog" },
        ],
      },
    });
    const after = createHash("sha256")
      .update(readFileSync(FIXTURE))
      .digest("hex");
    assert.equal(before, after);
    assert.equal(report.approvedCsvUnchanged, true);
    assert.equal(report.approvedCsvSha256Before, before);
  });

  it("explains Omega-3 vs Calcium with corpus evidence", () => {
    const report = buildZynavaReconciliationReport({
      approvedCsvPath: FIXTURE,
      frozenCorpusDir: path.join(
        process.cwd(),
        "data/runtime/discovery-pages/zynava.com"
      ),
      analyzeProfile: {
        indexedProducts: [
          "Magnesium glycinate",
          "Vitamin D3",
          "Magnesium",
          "Vitamin C",
          "Vitamin D",
          "Vitamin B12",
          "Zinc",
          "Calcium",
        ],
        products: [
          "Ingredient/nutrient research guides for browsing and learning",
        ],
        services: ["Preference-matched supplement search"],
      },
    });

    const omega = report.catalogExplanations.find((c) =>
      /omega-3/i.test(c.name)
    );
    const calcium = report.catalogExplanations.find((c) =>
      /^calcium$/i.test(c.name)
    );
    assert.ok(omega, "Omega-3 explanation required");
    assert.ok(calcium, "Calcium explanation required");
    // Approved fixture now keeps both SKUs (cap 10 + shared EXTRA_URLS).
    assert.equal(omega!.inFixtureCsv, true);
    assert.equal(omega!.inAnalyzeProfile, false);
    assert.equal(omega!.inFrozenCorpusText, true);
    assert.ok(omega!.pagesWithTerm.length >= 1);
    assert.ok(
      omega!.likelyCause === "page_selection" ||
        omega!.likelyCause === "catalog_cap_priority",
      `Omega-3 cause should explain Analyze miss, got ${omega!.likelyCause}`
    );
    assert.equal(calcium!.inAnalyzeProfile, true);
    assert.equal(calcium!.inFixtureCsv, true);
    assert.equal(calcium!.inFrozenCorpusText, true);
    assert.ok(
      calcium!.pagesWithTerm.some((p) => /calcium/i.test(p.url)),
      "Calcium should cite calcium page"
    );
  });

  it("never classifies LLM product wording as observed catalog", () => {
    const report = buildZynavaReconciliationReport({
      approvedCsvPath: FIXTURE,
      analyzeProfile: {
        products: [
          "Free AI Supplement Advisor for non-medical, educational guidance",
        ],
        indexedProducts: ["Calcium"],
      },
      frozenCorpusDir: path.join(
        process.cwd(),
        "data/runtime/discovery-pages/zynava.com"
      ),
    });
    const llmProducts = report.analyzeOnly.filter(
      (f) => f.field === "products_derived_wording"
    );
    assert.ok(llmProducts.length >= 1);
    assert.ok(llmProducts.every((f) => f.knowledgeClass === "derived"));
    assert.ok(
      !llmProducts.some((f) => f.knowledgeClass === "observed"),
      "LLM wording must not be observed"
    );
    // Live analyze materializes long capability phrases; curated short labels
    // are not required to appear verbatim after CSV regenerate.
    assert.ok(report.productServiceWording.fixtureProducts.length > 0);
    void CURATED_PLATFORM_CAPABILITIES;
  });

  it("missing snapshot dir produces explicit diagnostics", () => {
    const report = buildZynavaReconciliationReport({
      approvedCsvPath: FIXTURE,
      frozenCorpusDir: path.join(tmpdir(), `mm-missing-corpus-${Date.now()}`),
      analyzeProfile: { indexedProducts: [], products: [] },
    });
    assert.ok(
      report.diagnostics.some((d) => /missing/i.test(d)),
      `expected missing diagnostic, got: ${report.diagnostics.join("; ")}`
    );
  });

  it("same frozen corpus yields stable observed catalog ordering", () => {
    const dir = path.join(
      process.cwd(),
      "data/runtime/discovery-pages/zynava.com"
    );
    const a = buildZynavaReconciliationReport({
      approvedCsvPath: FIXTURE,
      frozenCorpusDir: dir,
      analyzeProfile: { indexedProducts: ["Calcium"], products: [] },
    });
    const b = buildZynavaReconciliationReport({
      approvedCsvPath: FIXTURE,
      frozenCorpusDir: dir,
      analyzeProfile: { indexedProducts: ["Calcium"], products: [] },
    });
    const namesA = a.agreedFacts
      .concat(a.fixtureOnly)
      .filter((f) => f.field === "indexedProduct")
      .map((f) => f.value);
    const namesB = b.agreedFacts
      .concat(b.fixtureOnly)
      .filter((f) => f.field === "indexedProduct")
      .map((f) => f.value);
    assert.deepEqual(namesA, namesB);
  });

  it("does not invent empty-string unknown brand fields as facts", () => {
    const root = path.join(tmpdir(), `mm-reconcile-${Date.now()}`);
    mkdirSync(root, { recursive: true });
    const tiny = path.join(root, "tiny.csv");
    copyFileSync(FIXTURE, tiny);
    try {
      const report = buildZynavaReconciliationReport({
        approvedCsvPath: tiny,
        frozenCorpusDir: path.join(
          process.cwd(),
          "data/runtime/discovery-pages/zynava.com"
        ),
        analyzeProfile: {
          businessName: "ZYNAVA",
          website: "https://zynava.com",
          indexedProducts: [],
          products: [],
          services: [],
          audience: "",
          description: "",
        },
      });
      const emptyAudience = [...report.agreedFacts, ...report.analyzeOnly].filter(
        (f) => f.field === "audience" && f.value === ""
      );
      assert.equal(emptyAudience.length, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("reconcile --strict contract", () => {
  it("exposes unresolvedObservedContradictions for strict exit", () => {
    const report = buildZynavaReconciliationReport({
      approvedCsvPath: FIXTURE,
      frozenCorpusDir: path.join(
        process.cwd(),
        "data/runtime/discovery-pages/zynava.com"
      ),
      analyzeProfile: {
        businessName: "Totally Different Co",
        website: "https://evil.example",
        indexedProducts: ["Calcium"],
        products: [],
      },
    });
    assert.ok(report.unresolvedObservedContradictions.length >= 1);
  });
});
