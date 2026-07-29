import { getRequiredSiteOrigin } from "./site-environment";

/**
 * Sole replaceable product identity for public SEO / brand chrome.
 *
 * On rename (see project-knowledge/BRAND_CHANGE_MAP.md):
 * - Update displayName / compactName
 * - Put retired public strings in formerNames (scans + verifier)
 * - Review tagline; keep shortDescription name-independent unless intentional
 * - Set namingStatus to "final" when locked
 * - Then run brand:impact → manual docs → seo:verify-brand
 *
 * Historical references to former names remain allowed in approved migration
 * contexts (DECISIONS/, KNOWLEDGE_CHANGELOG, BRAND_CHANGE_MAP migration log).
 *
 * Positioning copy lives in public-positioning.ts - keep tagline/shortDescription
 * synchronized with that source when claims change.
 */
const PRODUCT_IDENTITY_BASE = {
  namingStatus: "working-name" as const,

  displayName: "Market Month",
  compactName: "MarketMonth",
  formerNames: [] as readonly string[],
  legalName: null as string | null,

  tagline: "Website-first marketing direction",
  /** Brand-agnostic; compose with displayName in metadata/llms when needed. */
  shortDescription:
    "Turns the context already on a business website into evidence-grounded discovery and focused content directions, without starting from a blank brief.",

  schemaIdPath: "/#organization",
  logoPath: "/brand/logo.svg",
  socialImagePath: "/opengraph-image",
} as const;

export type ProductIdentity = typeof PRODUCT_IDENTITY_BASE & {
  canonicalOrigin: string;
};

/** Static fields (no origin) - safe for client chrome that does not need absolute URLs. */
export const PRODUCT_IDENTITY = PRODUCT_IDENTITY_BASE;

/** Full identity including resolved canonical origin (server / build time). */
export function getProductIdentity(): ProductIdentity {
  return {
    ...PRODUCT_IDENTITY_BASE,
    canonicalOrigin: getRequiredSiteOrigin(),
  };
}

export function absoluteUrl(path: string): string {
  const origin = getRequiredSiteOrigin();
  if (!path || path === "/") return `${origin}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}

/** Named public blurb: "{displayName} - {shortDescription}" when a named sentence helps. */
export function namedShortDescription(
  identity: Pick<ProductIdentity, "displayName" | "shortDescription"> = PRODUCT_IDENTITY
): string {
  return `${identity.displayName} - ${identity.shortDescription}`;
}
