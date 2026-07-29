export { analyzeWebsite } from "./analyze-website";
export {
  evaluateDiscoveryAcceptance,
  type DiscoveryAcceptanceReport,
} from "./acceptance-gate";
export {
  persistCrawlPageSnapshots,
  buildPageSnapshot,
  hashPageContent,
  type PageSnapshotRecord,
  type DiscoveryPagesManifest,
} from "./persist-page-snapshots";
export {
  buildDiscoveryProfileFromCorpus,
  DISCOVERY_PROFILE_BUILD_VERSION,
  type DiscoveryProfileBuild,
  type ObservedCompanyKnowledge,
  type DerivedCompanyKnowledge,
  type CuratedCapability,
} from "./build-profile-from-corpus";
export { ensureExtraPages } from "./crawl-extras";
export {
  getCompanyDiscoveryConfig,
  companyIdFromWebsite,
  type CompanyDiscoveryConfig,
} from "./company-discovery-config";
export {
  buildDiscoveryNarrative,
  type BuildDiscoveryNarrativeInput,
} from "./discovery-narrative";
export {
  brandProfileSchema,
  strategyPreviewSchema,
  strategyIntentSchema,
} from "./brand-profile";
export type {
  BrandProfile,
  StrategyPreview,
  StrategyIntent,
} from "./brand-profile";
export { crawlWebsite } from "./crawl-website";
export { extractBrandSignals } from "./extract-brand";
export { extractFaqs } from "./extract-faq";
export { extractContactPhones } from "./extract-contact";
export { extractIndexedProducts } from "./extract-product-jsonld";
export {
  cleanCatalogHeading,
  contentOpportunitiesForCatalog,
  isRejectedCatalogName,
  mergeAndScrubIndexedProducts,
  scrubIndexedProducts,
} from "./extract-catalog-names";
export { extractOrganizationFacts } from "./extract-organization";
export {
  collectOfferHints,
  isPageLevelSourceUrl,
  type OfferHint,
} from "./extract-offers";
export { buildDiscoveryEvidence, buildCrawlMeta } from "./build-evidence";
export { analyzeSeo } from "./analyze-seo";
export { findSocialLinks } from "./find-social-links";
export { analyzeCompetitors } from "./analyze-competitors";
export {
  buildBrandProfile,
  buildStrategyWithIntent,
} from "./build-strategy";
export { generateStrategyForIntent } from "./generate-strategy";
export { DISCOVERY_STAGES } from "./stages";
export type {
  DiscoveryStageId,
  DiscoveryStreamEvent,
  StageEvent,
  ResultEvent,
} from "./stages";
export { normalizeWebsiteUrl } from "./normalize-url";
