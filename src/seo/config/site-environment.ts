/**
 * Canonical site origin resolution.
 *
 * Preferred: SITE_ORIGIN (server truth), with NEXT_PUBLIC_SITE_URL matching it
 * for browser/SEO. AUTH_URL should match unless a documented exception exists.
 *
 * Resolve order: SITE_ORIGIN → NEXT_PUBLIC_SITE_URL → NEXT_PUBLIC_APP_URL (legacy).
 * Dev may fall back to localhost. Production hard-fails if missing/invalid.
 */

const DEV_FALLBACK = "http://localhost:3000";

function parseOrigin(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

function readConfiguredOrigin(): string | undefined {
  return (
    parseOrigin(process.env.SITE_ORIGIN) ||
    parseOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    parseOrigin(process.env.NEXT_PUBLIC_APP_URL)
  );
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Absolute origin with no trailing slash. Throws in production if missing/invalid. */
export function getRequiredSiteOrigin(): string {
  const configured = readConfiguredOrigin();
  if (configured) return configured;

  if (isProductionRuntime()) {
    throw new Error(
      "Missing or invalid SITE_ORIGIN (or NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_APP_URL). " +
        "Production builds must set an absolute https origin so SEO surfaces " +
        "never emit localhost canonicals."
    );
  }

  return DEV_FALLBACK;
}

export function getSiteOriginOrNull(): string | null {
  try {
    return getRequiredSiteOrigin();
  } catch {
    return null;
  }
}

/**
 * Warns (does not throw) when public/auth origins intentionally diverge.
 * Call from ops scripts or readiness checks as needed.
 */
export function describeOriginAlignment(): {
  siteOrigin: string | null;
  nextPublicSiteUrl: string | undefined;
  authUrl: string | undefined;
  aligned: boolean;
  notes: string[];
} {
  const siteOrigin = getSiteOriginOrNull();
  const nextPublicSiteUrl = parseOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  const authUrl = parseOrigin(process.env.AUTH_URL);
  const notes: string[] = [];

  if (siteOrigin && nextPublicSiteUrl && siteOrigin !== nextPublicSiteUrl) {
    notes.push(
      "NEXT_PUBLIC_SITE_URL differs from SITE_ORIGIN - document why or align them."
    );
  }
  if (siteOrigin && authUrl && siteOrigin !== authUrl) {
    notes.push(
      "AUTH_URL differs from SITE_ORIGIN - document why (rare) or align them."
    );
  }

  return {
    siteOrigin,
    nextPublicSiteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    authUrl: process.env.AUTH_URL,
    aligned: notes.length === 0,
    notes,
  };
}
