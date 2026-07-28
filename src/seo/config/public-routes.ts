/**
 * Earn-to-index registry: only listed routes enter the sitemap.
 * App shells are intentionally omitted (noindex via layout metadata).
 */
export type PublicRouteEntry = {
  path: string;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority: number;
};

export const PUBLIC_ROUTES: readonly PublicRouteEntry[] = [
  {
    path: "/",
    changeFrequency: "weekly",
    priority: 1,
  },
] as const;

/** App HTML routes that stay crawlable but must not be indexed or sitemapped. */
export const APP_HTML_ROUTES = [
  "/dashboard",
  "/brand",
  "/strategy",
  "/content",
  "/review",
  "/calendar",
  "/analytics",
  "/settings",
  "/help",
] as const;
