export type PageKind =
  | "home"
  | "products"
  | "how_it_works"
  | "about"
  | "faq"
  | "testimonials"
  | "blog"
  | "contact"
  | "other";

export type CrawledPage = {
  url: string;
  status: number;
  html: string;
  title: string;
  kind: PageKind;
  text?: string;
  collectionMethod?: "fetch" | "playwright";
};

export type CrawlCorpus = {
  normalizedUrl: string;
  origin: string;
  pages: CrawledPage[];
};

export type FaqEntry = {
  question: string;
  answer: string;
  sourceUrl?: string;
};

export type CatalogProduct = {
  name: string;
  price?: string;
  sourceUrl: string;
};

export type OrganizationFacts = {
  name?: string;
  legalName?: string;
  description?: string;
  email?: string;
  telephone?: string;
  foundingDate?: string;
  founder?: string;
  areaServed?: string;
  streetAddress?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  knowsAbout: string[];
  sameAs: string[];
  offerNames: string[];
  sourceUrl: string;
};

export type BrandSignals = {
  title: string;
  metaDescription: string;
  headings: string[];
  colors: string[];
  logoUrl?: string;
  contactEmails: string[];
  /** Phones from tel: links / contact pages / Organization JSON-LD. */
  contactPhones: string[];
  aboutText: string;
  productText: string;
  /** Flat FAQ page text (legacy blob). Prefer `faqs` for Q/A. */
  faqText: string;
  /** Structured FAQ entries from JSON-LD / accordion extraction. */
  faqs: FaqEntry[];
  /** Product / Offer names from JSON-LD (catalog, not platform capabilities). */
  catalogProducts: CatalogProduct[];
  /** Organization / LocalBusiness JSON-LD facts when present. */
  organization?: OrganizationFacts | null;
  bodySample: string;
  testimonialText: string;
  blogText: string;
  ctaTexts: string[];
  locationHints: string[];
};

export type CompetitorHints = {
  categoryKeywords: string[];
  locationHints: string[];
  productKeywords: string[];
};

export type AnalyzeWebsiteInput = {
  url: string;
  /**
   * When true, skip sticky DB cache and re-crawl.
   * Default false preserves prior analyze behavior.
   */
  forceRefresh?: boolean;
  onStage?: (
    id: import("./stages").DiscoveryStageId,
    status: import("./stages").StageStatus
  ) => void | Promise<void>;
};
