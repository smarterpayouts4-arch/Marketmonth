export function normalizeWebsiteUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Website URL is required");
  }

  // Reject explicit non-http schemes before we prepend https://
  // (otherwise "ftp://x" becomes "https://ftp://x" and silently "works").
  const explicitScheme = trimmed.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (explicitScheme) {
    const scheme = explicitScheme[1].toLowerCase();
    if (scheme !== "http" && scheme !== "https") {
      throw new Error("Only http and https URLs are supported");
    }
  }

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid website URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported");
  }

  url.hash = "";
  url.search = "";
  // Strip trailing slash on non-root paths.
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  let normalized = url.toString();
  // Origin-only URLs always serialize with a trailing slash in WHATWG URL;
  // strip it so https://x.com and https://x.com/ share one brand key.
  if (url.pathname === "/" && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/** Alternate slash form for legacy rows written before origin slash canonicalization. */
export function websiteUrlSlashAlternates(normalizedUrl: string): string[] {
  const primary = normalizedUrl.trim();
  if (!primary) return [];
  const alt = primary.endsWith("/")
    ? primary.slice(0, -1)
    : `${primary}/`;
  return alt && alt !== primary ? [primary, alt] : [primary];
}

export function getOrigin(normalizedUrl: string): string {
  return new URL(normalizedUrl).origin;
}
