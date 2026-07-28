import type { MetadataRoute } from "next";

import { buildSitemap } from "@/seo/foundation/sitemap";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap();
}
