import { findPassagesForTerm, type FrozenPage } from "../frozen-corpus";
import type { CatalogDiffExplanation } from "../types";

import { normName } from "./names";

export function explainCatalogItem(args: {
  name: string;
  fixtureNames: Set<string>;
  analyzeNames: Set<string>;
  pages: FrozenPage[];
  fullCapNames: string[];
  withoutExplorerCapNames: string[];
}): CatalogDiffExplanation {
  const key = normName(args.name);
  const inFixture = args.fixtureNames.has(key);
  const inAnalyze = args.analyzeNames.has(key);
  const pagesWithTerm = findPassagesForTerm(args.pages, args.name);
  const inCorpus = pagesWithTerm.length > 0;
  const inFull = args.fullCapNames.some((n) => normName(n) === key);
  const inWithoutExplorer = args.withoutExplorerCapNames.some(
    (n) => normName(n) === key
  );

  let likelyCause: CatalogDiffExplanation["likelyCause"] = "unknown";
  let detail = "";

  if (inFixture && inAnalyze) {
    likelyCause = "present_both";
    detail = "Present in both fixture CSV and analyze profile.";
  } else if (!inCorpus) {
    likelyCause = "missing_evidence";
    detail =
      "Term not found in frozen Layer-1 cleanedText — cannot evidence from current snapshots.";
  } else if (inFixture && !inAnalyze) {
    if (inFull && !inWithoutExplorer) {
      likelyCause = "page_selection";
      detail =
        "Appears when ingredient-explorer (and full frozen corpus) is included in catalog merge; drops when explorer page is excluded (Analyze-like 9-page crawl often omits /tools/ingredient-explorer).";
    } else if (inFull && inWithoutExplorer && !inAnalyze) {
      likelyCause = "catalog_cap_priority";
      detail =
        "Present in uncapped/frozen mining but may be dropped by the 8-slot priority cap or a different live crawl ordering versus the fixture refresh extras.";
    } else if (!inFull && inFixture) {
      likelyCause = "fixture_inheritance";
      detail =
        "Listed in fixture CSV but not reproduced by current frozen-corpus catalog merge — may be stale inheritance or a prior crawl.";
    } else {
      likelyCause = "page_selection";
      detail =
        "Analyze and refresh both seed EXTRA_URLS (ingredient-explorer + how-it-works); catalog diffs should shrink when both paths use the same corpus.";
    }
  } else if (!inFixture && inAnalyze) {
    const omegaInFull = args.fullCapNames.some((n) => normName(n) === "omega-3");
    if (omegaInFull && !inFull && (inWithoutExplorer || inCorpus)) {
      likelyCause = "catalog_cap_priority";
      detail =
        "Calcium is evidenced (e.g. /supplements/catalog/minerals/calcium). Catalog priority places Omega-3 before Calcium in the 8-slot cap; fixture refresh that includes Omega-3 (via ingredient-explorer) drops Calcium, while Analyze without Omega-3 keeps Calcium.";
    } else if (!inFull && inWithoutExplorer) {
      likelyCause = "catalog_cap_priority";
      detail =
        "When Omega-3 (higher priority) is absent from the crawl set, Calcium enters the capped catalog. Fixture with Omega-3 pushes Calcium out of the top 8.";
    } else if (inCorpus) {
      likelyCause = "page_selection";
      detail =
        "Analyze crawl included a calcium product page and listed Calcium in indexedProducts; fixture capped list preferred other SKUs (often Omega-3 from explorer).";
    } else {
      likelyCause = "missing_evidence";
      detail = "Analyze lists Calcium but frozen corpus has no supporting passage.";
    }
  }

  return {
    name: args.name,
    inFixtureCsv: inFixture,
    inAnalyzeProfile: inAnalyze,
    inFrozenCorpusText: inCorpus,
    pagesWithTerm: pagesWithTerm.slice(0, 4),
    likelyCause,
    detail,
  };
}

export function buildCatalogExplanations(args: {
  fixtureCatalog: string[];
  analyzeCatalog: string[];
  pages: FrozenPage[];
  fullCapNames: string[];
  withoutExplorerCapNames: string[];
}) {
  const fixtureNameSet = new Set(args.fixtureCatalog.map(normName));
  const analyzeNameSet = new Set(args.analyzeCatalog.map(normName));
  const focusNames = [
    "Omega-3",
    "Calcium",
    ...args.fixtureCatalog,
    ...args.analyzeCatalog,
  ];
  const uniqueFocus = [
    ...new Set(focusNames.map((n) => n.trim()).filter(Boolean)),
  ];

  const catalogExplanations = uniqueFocus
    .filter((n) => {
      const k = normName(n);
      return (
        k === "omega-3" ||
        k === "calcium" ||
        fixtureNameSet.has(k) !== analyzeNameSet.has(k)
      );
    })
    .map((name) =>
      explainCatalogItem({
        name,
        fixtureNames: fixtureNameSet,
        analyzeNames: analyzeNameSet,
        pages: args.pages,
        fullCapNames: args.fullCapNames,
        withoutExplorerCapNames: args.withoutExplorerCapNames,
      })
    );

  const seenExpl = new Set<string>();
  return catalogExplanations.filter((e) => {
    const k = normName(e.name);
    if (seenExpl.has(k)) return false;
    seenExpl.add(k);
    return true;
  });
}
