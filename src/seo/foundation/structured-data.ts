import { APPROVED_CAPABILITIES } from "../config/approved-capabilities";
import { getProductIdentity } from "../config/product-identity";
import { organizationId } from "./canonical";

export type JsonLdGraph = Record<string, unknown>;

export function buildOrganizationJsonLd(): JsonLdGraph {
  const identity = getProductIdentity();
  return {
    "@type": "Organization",
    "@id": organizationId(),
    name: identity.displayName,
    alternateName: identity.compactName,
    url: identity.canonicalOrigin,
    description: identity.shortDescription,
    logo: `${identity.canonicalOrigin}${identity.logoPath}`,
  };
}

export function buildWebSiteJsonLd(): JsonLdGraph {
  const identity = getProductIdentity();
  return {
    "@type": "WebSite",
    "@id": `${identity.canonicalOrigin}/#website`,
    url: identity.canonicalOrigin,
    name: identity.displayName,
    description: identity.shortDescription,
    publisher: { "@id": organizationId() },
    inLanguage: "en-US",
  };
}

export function buildSoftwareApplicationJsonLd(): JsonLdGraph {
  const identity = getProductIdentity();
  return {
    "@type": "SoftwareApplication",
    name: identity.displayName,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: identity.shortDescription,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Prototype / early access — pricing not finalized",
    },
    featureList: [...APPROVED_CAPABILITIES.live],
    publisher: { "@id": organizationId() },
  };
}

export function buildLandingJsonLdGraph(): JsonLdGraph {
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationJsonLd(),
      buildWebSiteJsonLd(),
      buildSoftwareApplicationJsonLd(),
    ],
  };
}

export function jsonLdScriptContent(graph: JsonLdGraph): string {
  return JSON.stringify(graph);
}
