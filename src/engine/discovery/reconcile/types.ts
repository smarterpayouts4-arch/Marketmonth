export type KnowledgeClass =
  | "observed"
  | "derived"
  | "curated_fixture"
  | "inherited_fixture"
  | "unknown";

export type ReconcileFact = {
  field: string;
  value: string;
  knowledgeClass: KnowledgeClass;
  sourceUrl?: string;
  pageId?: string;
  passageExcerpt?: string;
  presentInFrozenCorpus?: boolean;
  notes?: string;
};

export type CatalogDiffExplanation = {
  name: string;
  inFixtureCsv: boolean;
  inAnalyzeProfile: boolean;
  inFrozenCorpusText: boolean;
  pagesWithTerm: Array<{ pageId: string; url: string; excerpt: string }>;
  likelyCause:
    | "page_selection"
    | "catalog_cap_priority"
    | "classification_reject"
    | "fixture_inheritance"
    | "present_both"
    | "missing_evidence"
    | "unknown";
  detail: string;
};

export type FieldDiff = {
  field: string;
  fixtureValue: string | null;
  analyzeValue: string | null;
  knowledgeClassFixture: KnowledgeClass;
  knowledgeClassAnalyze: KnowledgeClass;
  agreed: boolean;
  contradiction: boolean;
  missingEvidence: boolean;
  explanation: string;
};

export type PageCoverageDiff = {
  frozenPages: Array<{
    pageId: string;
    url: string;
    kind: string;
    contentHash: string;
  }>;
  fixtureExtraUrls: string[];
  analyzeMissingUrlsHint: string[];
  diagnostics: string[];
};

export type ReconciliationReport = {
  generatedAt: string;
  approvedCsvPath: string;
  approvedCsvSha256Before: string;
  approvedCsvSha256After: string;
  approvedCsvUnchanged: boolean;
  beforeCsvPath: string | null;
  analyzeProfilePath: string | null;
  frozenCorpusDir: string | null;
  modelName: string | null;
  extractorNote: string;
  pageCoverageDiff: PageCoverageDiff;
  agreedFacts: ReconcileFact[];
  fixtureOnly: ReconcileFact[];
  analyzeOnly: ReconcileFact[];
  contradictions: FieldDiff[];
  missingEvidence: ReconcileFact[];
  catalogExplanations: CatalogDiffExplanation[];
  productServiceWording: {
    fixtureProducts: string[];
    fixtureServices: string[];
    analyzeProducts: string[];
    analyzeServices: string[];
    explanation: string;
  };
  fieldClasses: Record<string, KnowledgeClass>;
  unresolvedObservedContradictions: FieldDiff[];
  diagnostics: string[];
};
