/**
 * Categorized brand-name occurrence report (planning tool).
 * Enforcement remains: npm run seo:verify-brand
 *
 *   npm run brand:impact
 */
import fs from "node:fs";

import {
  BRAND_VERIFY_SKIP_PREFIXES,
  HISTORICAL_NAME_ALLOW_PREFIXES,
  isHistoricalNamePath,
  pathMatchesPrefix,
} from "../config/brand-history";
import {
  brandNamePatterns,
  collectTextFiles,
  REPO_ROOT,
  toPosixRel,
} from "./brand-scan-shared";

export type ImpactCategory =
  | "automated_consumer"
  | "approved_documentation"
  | "technical_identifier"
  | "historical_record"
  | "user_facing_stale"
  | "unknown_manual_review";

export type ImpactHit = {
  file: string;
  matches: string[];
  category: ImpactCategory;
};

const AUTOMATED_PREFIXES = [
  "src/seo/config/product-identity.ts",
  "src/seo/foundation/",
  "src/seo/config/",
  "src/components/landing/",
  "src/components/layout/app-sidebar.tsx",
  "src/engine/discovery/build-strategy/prompts.ts",
  "src/app/api/project-knowledge/ask/route.ts",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/opengraph-image.tsx",
  "src/app/llms.txt/",
  "src/app/robots.ts",
  "src/app/sitemap.ts",
  "src/components/seo/",
];

const DOCS_PREFIXES = [
  "project-knowledge/",
  "docs/",
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "agent-prompt-system/",
];

const TECHNICAL_PREFIXES = [
  "package.json",
  "package-lock.json",
  "mcp/",
  ".cursor/",
  "docker",
  "Dockerfile",
];

function categorize(rel: string): ImpactCategory {
  if (isHistoricalNamePath(rel)) return "historical_record";
  if (pathMatchesPrefix(rel, AUTOMATED_PREFIXES)) return "automated_consumer";
  if (pathMatchesPrefix(rel, DOCS_PREFIXES)) return "approved_documentation";
  if (
    TECHNICAL_PREFIXES.some(
      (p) => rel === p || rel.startsWith(p) || rel.includes(p)
    )
  ) {
    return "technical_identifier";
  }
  // Outside verify skip → likely user-facing stale if hard-coded
  if (!pathMatchesPrefix(rel, BRAND_VERIFY_SKIP_PREFIXES)) {
    return "user_facing_stale";
  }
  return "unknown_manual_review";
}

export function scanBrandImpact(root = REPO_ROOT): {
  total: number;
  byCategory: Record<ImpactCategory, number>;
  hits: ImpactHit[];
} {
  const patterns = brandNamePatterns();
  const files: string[] = [];
  collectTextFiles(root, files);
  const hits: ImpactHit[] = [];

  for (const file of files) {
    const rel = toPosixRel(file, root);
    // Skip pure tooling scanners themselves to reduce noise
    if (rel.startsWith("src/seo/verification/")) continue;

    const content = fs.readFileSync(file, "utf8");
    const found = new Set<string>();
    for (const { label, pattern } of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) found.add(label);
    }
    if (found.size === 0) continue;
    hits.push({
      file: rel,
      matches: [...found],
      category: categorize(rel),
    });
  }

  const byCategory: Record<ImpactCategory, number> = {
    automated_consumer: 0,
    approved_documentation: 0,
    technical_identifier: 0,
    historical_record: 0,
    user_facing_stale: 0,
    unknown_manual_review: 0,
  };
  for (const hit of hits) byCategory[hit.category] += 1;

  return { total: hits.length, byCategory, hits };
}

function main() {
  const report = scanBrandImpact();
  console.log(`Old public name occurrences: ${report.total}`);
  console.log(`  Automatically controlled: ${report.byCategory.automated_consumer}`);
  console.log(
    `  Documentation requiring review: ${report.byCategory.approved_documentation}`
  );
  console.log(
    `  Technical identifiers: ${report.byCategory.technical_identifier}`
  );
  console.log(
    `  Historical references allowed: ${report.byCategory.historical_record}`
  );
  console.log(
    `  Unexpected hard-coded reference: ${report.byCategory.user_facing_stale}`
  );
  console.log(
    `  Unknown / manual review: ${report.byCategory.unknown_manual_review}`
  );
  console.log("");
  console.log(
    `Historical allow prefixes: ${HISTORICAL_NAME_ALLOW_PREFIXES.join(", ")}`
  );
  if (report.byCategory.user_facing_stale > 0) {
    console.log("\nUnexpected hard-coded files:");
    for (const hit of report.hits.filter((h) => h.category === "user_facing_stale")) {
      console.log(`  ${hit.file}: ${hit.matches.join(", ")}`);
    }
  }
}

const isDirect =
  process.argv[1]?.includes("brand-impact") ||
  process.argv[1]?.replace(/\\/g, "/").endsWith("brand-impact.ts");
if (isDirect) main();
