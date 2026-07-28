import { buildRobots } from "../../foundation/robots";
import { buildSitemap } from "../../foundation/sitemap";
import { PUBLIC_ROUTES } from "../../config/public-routes";
import type { AuditIssue } from "./rendered-site-audit";

export function auditCrawlability(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const sitemap = buildSitemap();
  const robots = buildRobots();

  if (sitemap.length === 0) {
    issues.push({
      code: "SITEMAP_EMPTY",
      severity: "error",
      message: "Sitemap has no URLs",
      affectedFiles: ["src/seo/config/public-routes.ts", "src/seo/foundation/sitemap.ts"],
    });
  }

  if (sitemap.length !== PUBLIC_ROUTES.length) {
    issues.push({
      code: "SITEMAP_ROUTE_MISMATCH",
      severity: "error",
      message: "Sitemap length does not match PUBLIC_ROUTES",
      affectedFiles: ["src/seo/config/public-routes.ts", "src/seo/foundation/sitemap.ts"],
    });
  }

  const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
  const disallowsAppGroup = rules.some((rule) => {
    const d = rule?.disallow;
    const list = Array.isArray(d) ? d : d ? [d] : [];
    return list.some((p) => String(p).includes("(app)"));
  });
  if (disallowsAppGroup) {
    issues.push({
      code: "ROBOTS_INVALID_ROUTE_GROUP",
      severity: "error",
      message: "robots.txt must not reference Next.js (app) route groups",
      affectedFiles: ["src/seo/foundation/robots.ts", "src/seo/config/crawler-policy.ts"],
    });
  }

  return issues;
}
