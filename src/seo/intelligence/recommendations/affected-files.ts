import type { AuditIssue } from "../audits/rendered-site-audit";

const SURFACE_FILE_MAP: Record<string, string[]> = {
  "Landing metadata": [
    "src/seo/foundation/metadata.ts",
    "src/app/layout.tsx",
    "src/app/page.tsx",
  ],
  "Structured data": [
    "src/seo/foundation/structured-data.ts",
    "src/components/seo/json-ld.tsx",
  ],
  "Crawler policy": [
    "src/seo/config/crawler-policy.ts",
    "src/seo/foundation/robots.ts",
    "src/app/robots.ts",
  ],
  Sitemap: [
    "src/seo/config/public-routes.ts",
    "src/seo/foundation/sitemap.ts",
    "src/app/sitemap.ts",
  ],
  "llms.txt": [
    "src/seo/foundation/llms-document.ts",
    "src/app/llms.txt/route.ts",
  ],
  "Product identity": ["src/seo/config/product-identity.ts"],
  "Social images": [
    "src/seo/foundation/social-images.ts",
    "src/app/opengraph-image.tsx",
  ],
};

export function filesForSurfaces(surfaces: string[]): string[] {
  const files = new Set<string>();
  for (const surface of surfaces) {
    for (const f of SURFACE_FILE_MAP[surface] ?? []) files.add(f);
  }
  if (files.size === 0) files.add("src/seo/");
  return [...files];
}

export function filesFromAuditIssues(issues: AuditIssue[]): string[] {
  const files = new Set<string>();
  for (const issue of issues) {
    for (const f of issue.affectedFiles) files.add(f);
  }
  return [...files];
}
