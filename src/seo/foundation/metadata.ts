import type { Metadata } from "next";

import {
  PRODUCT_IDENTITY,
  getProductIdentity,
  namedShortDescription,
} from "../config/product-identity";
import { canonicalForPath } from "./canonical";

export function buildRootMetadata(): Metadata {
  const identity = getProductIdentity();
  const titleDefault = identity.displayName;
  // Named composition for social/search; shortDescription itself stays brand-agnostic
  const description = namedShortDescription(identity);

  return {
    metadataBase: new URL(identity.canonicalOrigin),
    title: {
      default: titleDefault,
      template: `%s · ${identity.compactName}`,
    },
    description,
    applicationName: identity.displayName,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: identity.canonicalOrigin,
      siteName: identity.displayName,
      title: titleDefault,
      description,
      images: [
        {
          url: identity.socialImagePath,
          width: 1200,
          height: 630,
          alt: `${identity.displayName} - ${identity.tagline}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titleDefault,
      description,
      images: [identity.socialImagePath],
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: canonicalForPath("/"),
    },
  };
}

export function buildLandingMetadata(): Metadata {
  const identity = getProductIdentity();
  const description = namedShortDescription(identity);
  return {
    title: {
      absolute: `${identity.displayName} - ${identity.tagline}`,
    },
    description,
    alternates: {
      canonical: canonicalForPath("/"),
    },
    openGraph: {
      title: `${identity.displayName} - ${identity.tagline}`,
      description,
      url: canonicalForPath("/"),
    },
  };
}

/** Inherited by all /(app) HTML shells - crawlable, not indexed. */
export function buildAppShellMetadata(): Metadata {
  return {
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

/** Client-safe display strings (no origin resolution). */
export function publicBrandChrome() {
  return {
    displayName: PRODUCT_IDENTITY.displayName,
    compactName: PRODUCT_IDENTITY.compactName,
    tagline: PRODUCT_IDENTITY.tagline,
    shortDescription: PRODUCT_IDENTITY.shortDescription,
  };
}
