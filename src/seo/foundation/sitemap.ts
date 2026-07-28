import type { MetadataRoute } from "next";

import { absoluteUrl } from "../config/product-identity";
import { PUBLIC_ROUTES } from "../config/public-routes";

export function buildSitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
