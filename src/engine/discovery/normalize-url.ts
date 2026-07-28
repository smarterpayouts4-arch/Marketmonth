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
  // Strip trailing slash except origin
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}

export function getOrigin(normalizedUrl: string): string {
  return new URL(normalizedUrl).origin;
}
