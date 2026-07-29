import type { PageKind } from "../types";

/** Maximum successfully fetched pages (including home). */
export const MAX_SUCCESSFUL_PAGES = 10;

/**
 * Maximum fetch attempts / dequeued candidate URLs (includes failures).
 * Stop when either this or MAX_SUCCESSFUL_PAGES is hit.
 */
export const MAX_FETCH_ATTEMPTS = 24;

/** Cap distinct product/catalog pages kept in the corpus. */
export const MAX_CATALOG_PAGES = 3;

/** Marketing priority for deterministic slot selection. */
export const KIND_PRIORITY: Record<Exclude<PageKind, "other">, number> = {
  home: 1000,
  products: 900,
  how_it_works: 850,
  about: 800,
  faq: 700,
  testimonials: 600,
  blog: 500,
  contact: 400,
};

export const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "mc_cid",
  "mc_eid",
]);
