import { TRACKING_PARAMS } from "./constants";

export function canonicalizeUrl(raw: string, origin: string): string | null {
  try {
    const absolute = new URL(raw);
    if (absolute.protocol !== "http:" && absolute.protocol !== "https:") {
      return null;
    }
    if (absolute.origin !== origin) return null;
    absolute.hash = "";
    for (const key of [...absolute.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        absolute.searchParams.delete(key);
      }
    }
    // Stable query order
    absolute.searchParams.sort();
    let href = absolute.toString();
    if (href.endsWith("/") && absolute.pathname !== "/") {
      href = href.slice(0, -1);
    }
    return href;
  } catch {
    return null;
  }
}
