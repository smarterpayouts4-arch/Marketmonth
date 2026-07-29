/** Stable development identity for the Zynava prototype workspace. */

export const DEV_USER_EMAIL = "dev@marketmonth.local";
export const DEV_USER_NAME = "Oscar";

/** Deterministic brand key — never claim brands owned by other users. */
export const DEV_ZYNAVA_BRAND_KEY = "dev-zynava";

export const ZYNAVA_WEBSITE = "https://zynava.com";
export const ZYNAVA_NAME = "Zynava";

/** Curated platform capabilities for Zynava refresh/reconcile scripts. */
export const ZYNAVA_PLATFORM_CAPABILITIES = [
  "Supplement search",
  "Price comparison",
  "Supplement plan builder",
  "AI supplement advisor",
] as const;

/** Cookie name for signed active brand handoff (HTTP-only). */
export const ACTIVE_BRAND_COOKIE = "mm_active_brand";
