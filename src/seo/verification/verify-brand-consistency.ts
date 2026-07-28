/**
 * Enforcement: forbidden stale hard-codes of active/former public names.
 * Allowed historical paths are skipped (see brand-history.ts).
 * Planning report: npm run brand:impact
 */
import {
  BRAND_VERIFY_SKIP_PREFIXES,
  isHistoricalNamePath,
  pathMatchesPrefix,
} from "../config/brand-history";
import {
  brandNamePatterns,
  collectTextFiles,
  REPO_ROOT,
  toPosixRel,
} from "./brand-scan-shared";
import fs from "node:fs";

export type BrandViolation = {
  file: string;
  matches: string[];
  kind: "forbidden_stale";
};

export function verifyBrandConsistency(root = REPO_ROOT): {
  ok: boolean;
  violations: BrandViolation[];
  historicalSkipped: number;
} {
  const patterns = brandNamePatterns();
  const files: string[] = [];
  collectTextFiles(root, files);
  const violations: BrandViolation[] = [];
  let historicalSkipped = 0;

  for (const file of files) {
    const rel = toPosixRel(file, root);

    if (isHistoricalNamePath(rel)) {
      historicalSkipped += 1;
      continue;
    }
    if (pathMatchesPrefix(rel, BRAND_VERIFY_SKIP_PREFIXES)) continue;

    const content = fs.readFileSync(file, "utf8");
    const found = new Set<string>();
    for (const { label, pattern } of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) found.add(label);
    }
    if (found.size > 0) {
      violations.push({
        file: rel,
        matches: [...found],
        kind: "forbidden_stale",
      });
    }
  }

  return {
    ok: violations.length === 0,
    violations,
    historicalSkipped,
  };
}

function main() {
  const result = verifyBrandConsistency();
  if (!result.ok) {
    console.error("Brand consistency failed — forbidden stale product names:");
    for (const v of result.violations) {
      console.error(`  [${v.kind}] ${v.file}: ${v.matches.join(", ")}`);
    }
    console.error(
      "\nUse PRODUCT_IDENTITY, move history to an allowed migration path, or see BRAND_CHANGE_MAP.md."
    );
    process.exit(1);
  }
  console.log(
    `ok brand consistency — no forbidden stale names (historical paths noted: ${result.historicalSkipped} files scanned under allow prefixes)`
  );
}

const isDirect =
  process.argv[1]?.includes("verify-brand-consistency") ||
  process.argv[1]?.replace(/\\/g, "/").endsWith("verify-brand-consistency.ts");
if (isDirect) main();
