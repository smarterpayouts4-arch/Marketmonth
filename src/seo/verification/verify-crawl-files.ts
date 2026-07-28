import { buildLlmsTxt } from "../foundation/llms-document";
import { buildRobots } from "../foundation/robots";
import { buildSitemap } from "../foundation/sitemap";
import { getRequiredSiteOrigin } from "../config/site-environment";
import { PUBLIC_ROUTES } from "../config/public-routes";

export function verifyCrawlFiles(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  try {
    const origin = getRequiredSiteOrigin();
    const sitemap = buildSitemap();
    if (sitemap.length !== PUBLIC_ROUTES.length) {
      errors.push(
        `sitemap length ${sitemap.length} !== public routes ${PUBLIC_ROUTES.length}`
      );
    }
    for (const entry of sitemap) {
      if (!entry.url.startsWith(origin)) {
        errors.push(`sitemap URL not under origin: ${entry.url}`);
      }
      if (entry.url.includes("/api/")) {
        errors.push(`sitemap must not include API: ${entry.url}`);
      }
    }

    const robots = buildRobots();
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
    const hasApiDisallow = rules.some((rule) => {
      const d = rule?.disallow;
      const list = Array.isArray(d) ? d : d ? [d] : [];
      return list.some((p) => String(p).includes("/api"));
    });
    if (!hasApiDisallow) errors.push("robots missing /api disallow");
    if (!robots.sitemap?.includes("sitemap.xml")) {
      errors.push("robots missing sitemap declaration");
    }

    const llms = buildLlmsTxt();
    if (!llms.includes("experimental interoperability")) {
      errors.push("llms.txt missing experimental interoperability label");
    }
    if (!llms.includes(origin)) {
      errors.push("llms.txt missing canonical origin");
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  return { ok: errors.length === 0, errors };
}

function main() {
  const result = verifyCrawlFiles();
  if (!result.ok) {
    console.error("Crawl file verification failed:");
    for (const e of result.errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("ok crawl files (sitemap / robots / llms builders)");
}

const isDirect =
  process.argv[1]?.includes("verify-crawl-files") ||
  process.argv[1]?.replace(/\\/g, "/").endsWith("verify-crawl-files.ts");
if (isDirect) main();
