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
export { buildDiscoveryActivationProfile } from "./build-activation-profile";
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
export { extractCatalogProducts } from "./extract-product-jsonld";
export {
  cleanCatalogHeading,
  contentOpportunitiesForCatalog,
  isRejectedCatalogName,
  mergeAndScrubCatalogProducts,
  scrubCatalogProducts,
} from "./extract-catalog-names";
export { extractOrganizationFacts } from "./extract-organization";
export { collectOfferHints } from "./extract-offers";
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
