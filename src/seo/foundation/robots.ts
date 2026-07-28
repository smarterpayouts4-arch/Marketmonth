import type { MetadataRoute } from "next";

import {
  AI_SEARCH_CRAWLER_ALLOW,
  CRAWLER_POLICY,
  ROBOTS_DISALLOW_PATHS,
} from "../config/crawler-policy";
import { absoluteUrl } from "../config/product-identity";

type RobotRule = {
  userAgent: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
};

/**
 * Robots policy:
 * - Public landing: allow crawl + index (via metadata)
 * - App HTML: allow crawl (so noindex is visible); not disallowed here
 * - /api/: disallow
 */
export function buildRobots(): MetadataRoute.Robots {
  const disallow = [...ROBOTS_DISALLOW_PATHS];

  const defaultRules: RobotRule = {
    userAgent: "*",
    allow: CRAWLER_POLICY.searchIndexing === "allow" ? "/" : undefined,
    disallow: [...disallow],
  };

  const aiRules: RobotRule[] =
    CRAWLER_POLICY.aiSearchRetrieval === "allow"
      ? AI_SEARCH_CRAWLER_ALLOW.map((userAgent) => ({
          userAgent,
          allow: "/",
          disallow: [...disallow],
        }))
      : [];

  const origin = absoluteUrl("/").replace(/\/$/, "");
  let host: string | undefined;
  try {
    host = new URL(origin).host;
  } catch {
    host = undefined;
  }

  return {
    rules: [defaultRules, ...aiRules],
    sitemap: absoluteUrl("/sitemap.xml"),
    host,
  };
}
