import { PRODUCT_IDENTITY } from "../config/product-identity";

/** Shared copy for OG / Twitter image rendering. */
export function socialImageCopy() {
  return {
    title: PRODUCT_IDENTITY.displayName,
    subtitle: PRODUCT_IDENTITY.tagline,
    alt: `${PRODUCT_IDENTITY.displayName} — ${PRODUCT_IDENTITY.tagline}`,
    width: 1200,
    height: 630,
  };
}
