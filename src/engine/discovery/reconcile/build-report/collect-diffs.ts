import { findPassagesForTerm, type FrozenPage } from "../frozen-corpus";
import type { CsvKnowledgeSlice } from "../fixture-from-projection";
import type {
  FieldDiff,
  KnowledgeClass,
  ReconcileFact,
} from "../types";

import { classForBrandField } from "./classify";
import { CURATED_PLATFORM_CAPABILITIES, type AnalyzeProfileSnapshot } from "./constants";
import { catalogNames, normName } from "./names";

export type DiffBuckets = {
  agreedFacts: ReconcileFact[];
  fixtureOnly: ReconcileFact[];
  analyzeOnly: ReconcileFact[];
  missingEvidence: ReconcileFact[];
  contradictions: FieldDiff[];
  fieldClasses: Record<string, KnowledgeClass>;
  fixtureCatalog: string[];
  analyzeCatalog: string[];
  productServiceWording: {
    fixtureProducts: string[];
    fixtureServices: string[];
    analyzeProducts: string[];
    analyzeServices: string[];
    explanation: string;
  };
};

export function collectDiffBuckets(args: {
  fixture: CsvKnowledgeSlice;
  analyze: AnalyzeProfileSnapshot;
  pages: FrozenPage[];
}): DiffBuckets {
  const { fixture, analyze, pages } = args;
  const agreedFacts: ReconcileFact[] = [];
  const fixtureOnly: ReconcileFact[] = [];
  const analyzeOnly: ReconcileFact[] = [];
  const missingEvidence: ReconcileFact[] = [];
  const contradictions: FieldDiff[] = [];

  const fixtureCatalog = [
    ...fixture.indexedProducts.map((p) => p.name),
    ...fixture.catalogEvidenceNames,
  ];
  const analyzeCatalog = catalogNames(analyze.indexedProducts);
  const fixtureNameSet = new Set(fixtureCatalog.map(normName));
  const analyzeNameSet = new Set(analyzeCatalog.map(normName));

  const fieldClasses: Record<string, KnowledgeClass> = {};
  for (const [field, et] of Object.entries(fixture.evidenceTypesByField)) {
    fieldClasses[field] = classForBrandField(field, et);
  }
  fieldClasses.products = "curated_fixture";
  fieldClasses.indexedProducts = "observed";
  fieldClasses.services = classForBrandField(
    "services",
    fixture.evidenceTypesByField.services
  );

  for (const name of new Set([...fixtureCatalog, ...analyzeCatalog])) {
    const k = normName(name);
    const inF = fixtureNameSet.has(k);
    const inA = analyzeNameSet.has(k);
    const passages = findPassagesForTerm(pages, name);
    const fact: ReconcileFact = {
      field: "indexedProduct",
      value: name,
      knowledgeClass: "observed",
      presentInFrozenCorpus: passages.length > 0,
      pageId: passages[0]?.pageId,
      sourceUrl: passages[0]?.url,
      passageExcerpt: passages[0]?.excerpt,
    };
    if (inF && inA) agreedFacts.push(fact);
    else if (inF) fixtureOnly.push(fact);
    else analyzeOnly.push(fact);
    if (passages.length === 0) {
      missingEvidence.push({
        ...fact,
        notes: "Catalog name lacks supporting passage in frozen corpus",
      });
    }
  }

  const scalarFields: Array<keyof CsvKnowledgeSlice> = [
    "businessName",
    "website",
    "description",
    "audience",
    "valueProposition",
    "brandVoice",
    "marketingOpportunity",
  ];

  const analyzeScalar = (field: (typeof scalarFields)[number]): string => {
    const v = (analyze as Record<string, unknown>)[field];
    return typeof v === "string" ? v.trim() : "";
  };

  for (const field of scalarFields) {
    const fv = String(fixture[field] ?? "").trim();
    const av = analyzeScalar(field);
    const kcF = classForBrandField(field, fixture.evidenceTypesByField[field]);
    const kcA: KnowledgeClass =
      field === "businessName" || field === "website" ? "observed" : "derived";
    fieldClasses[field] = kcF;

    if (!fv && !av) continue;
    if (fv && av && normName(fv) === normName(av)) {
      agreedFacts.push({ field, value: fv, knowledgeClass: kcF });
      continue;
    }
    if (fv && !av) {
      fixtureOnly.push({ field, value: fv, knowledgeClass: kcF });
      continue;
    }
    if (!fv && av) {
      analyzeOnly.push({ field, value: av, knowledgeClass: kcA });
      continue;
    }
    contradictions.push({
      field,
      fixtureValue: fv || null,
      analyzeValue: av || null,
      knowledgeClassFixture: kcF,
      knowledgeClassAnalyze: kcA,
      agreed: false,
      contradiction: kcF === "observed" || kcA === "observed",
      missingEvidence: false,
      explanation:
        kcF === "derived" || kcA === "derived"
          ? "Wording differs because Analyze uses LLM-derived brandProfile fields while the fixture refresh largely inherits curated/derived CSV values (and forces curated platform products)."
          : "Observed identity fields disagree — needs human review.",
    });
  }

  const fixtureProducts = fixture.products;
  const analyzeProducts = analyze.products ?? [];
  const fixtureServices = fixture.services;
  const analyzeServices = analyze.services ?? [];

  for (const p of fixtureProducts) {
    const curated = CURATED_PLATFORM_CAPABILITIES.some(
      (c) => normName(c) === normName(p)
    );
    fixtureOnly.push({
      field: "platformCapabilities",
      value: p,
      knowledgeClass: curated ? "curated_fixture" : "inherited_fixture",
      notes: "Fixture refresh forces PLATFORM_PRODUCTS; not catalog SKUs.",
    });
  }
  for (const p of analyzeProducts) {
    analyzeOnly.push({
      field: "products_derived_wording",
      value: p,
      knowledgeClass: "derived",
      notes:
        "LLM brandProfile.products wording — must not be treated as observed indexedProducts.",
    });
  }

  return {
    agreedFacts,
    fixtureOnly,
    analyzeOnly,
    missingEvidence,
    contradictions,
    fieldClasses,
    fixtureCatalog,
    analyzeCatalog,
    productServiceWording: {
      fixtureProducts,
      fixtureServices,
      analyzeProducts,
      analyzeServices,
      explanation:
        "Fixture refresh sets products[] to a fixed curated platform-capability list (search/compare/plan/advisor) and largely preserves services from the prior CSV. Analyze runs llmBrandProfile, which invents longer descriptive products/services strings from page signals. indexedProducts are signal-mined in both paths, but crawl page sets + the 8-slot priority cap change which SKUs survive (Omega-3 vs Calcium).",
    },
  };
}

export function buildPageCoverageDiff(args: {
  pages: FrozenPage[];
  frozenDir: string;
}) {
  const { pages, frozenDir } = args;
  return {
    frozenPages: pages.map((p) => ({
      pageId: p.pageId,
      url: p.url,
      kind: p.kind,
      contentHash: p.contentHash,
    })),
    fixtureExtraUrls: pages
      .filter((p) => /ingredient-explorer|how-it-works/i.test(p.url))
      .map((p) => p.url),
    analyzeMissingUrlsHint: [
      "https://zynava.com/tools/ingredient-explorer (seeded into Analyze BFS + ensureExtraPages)",
    ],
    diagnostics: frozenDir
      ? pages.length
        ? []
        : [`No pages loaded from ${frozenDir}`]
      : ["No frozen corpus dir"],
  };
}
