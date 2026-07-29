/** True when sourceUrl points at a specific page (not only site root). */
export function isPageLevelSourceUrl(
  sourceUrl: string | undefined,
  website?: string
): boolean {
  if (!sourceUrl?.trim()) return false;
  try {
    const u = new URL(sourceUrl);
    const path = u.pathname.replace(/\/+$/, "");
    if (!path || path === "") return false;
    if (website) {
      const home = new URL(
        /^https?:\/\//i.test(website) ? website : `https://${website}`
      );
      if (
        u.origin === home.origin &&
        (path === "" || path === "/" || path === home.pathname.replace(/\/+$/, ""))
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
