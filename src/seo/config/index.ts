export {
  PRODUCT_IDENTITY,
  getProductIdentity,
  absoluteUrl,
  namedShortDescription,
  type ProductIdentity,
} from "./product-identity";
export {
  getRequiredSiteOrigin,
  getSiteOriginOrNull,
  isProductionRuntime,
  describeOriginAlignment,
} from "./site-environment";
export {
  HISTORICAL_NAME_ALLOW_PREFIXES,
  BRAND_VERIFY_SKIP_PREFIXES,
  isHistoricalNamePath,
  pathMatchesPrefix,
} from "./brand-history";
export {
  CRAWLER_POLICY,
  ROBOTS_DISALLOW_PATHS,
  AI_SEARCH_CRAWLER_ALLOW,
  type CrawlerPolicy,
} from "./crawler-policy";
export {
  PUBLIC_ROUTES,
  APP_HTML_ROUTES,
  type PublicRouteEntry,
} from "./public-routes";
export { APPROVED_CAPABILITIES } from "./approved-capabilities";
export {
  PUBLIC_POSITIONING,
  PUBLIC_PROCESS,
  PUBLIC_DIFFERENTIATORS,
  PUBLIC_WHAT_YOU_GET,
  PUBLIC_ILLUSTRATIVE_STATS,
  CLAIM_LEDGER,
  PROHIBITED_PUBLIC_PHRASES,
  type CapabilityStatus,
  type ClaimLedgerEntry,
} from "./public-positioning";
