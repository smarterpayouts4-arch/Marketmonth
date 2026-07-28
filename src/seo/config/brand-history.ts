/**
 * Paths where former/public product names may appear as intentional history
 * or migration records (not forbidden stale usage).
 */
export const HISTORICAL_NAME_ALLOW_PREFIXES = [
  "project-knowledge/DECISIONS/",
  "project-knowledge/KNOWLEDGE_CHANGELOG.md",
  "project-knowledge/BRAND_CHANGE_MAP.md",
  "project-knowledge/generated/",
] as const;

/** Paths that are the live identity source or tooling (not stale user-facing hard-codes). */
export const IDENTITY_SOURCE_ALLOW_PREFIXES = [
  "src/seo/config/product-identity.ts",
  "src/seo/verification/",
] as const;

/**
 * Broad allowlist for seo:verify-brand (docs/tooling that are reviewed manually
 * or are not product chrome). Impact scan still categorizes these separately.
 */
export const BRAND_VERIFY_SKIP_PREFIXES = [
  ...IDENTITY_SOURCE_ALLOW_PREFIXES,
  ...HISTORICAL_NAME_ALLOW_PREFIXES,
  "project-knowledge/",
  "docs/",
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "Refrence folder/",
  "reference-library/",
  "agent-prompt-system/",
  "data/seo/",
  "mcp/",
  ".cursor/",
] as const;

export function pathMatchesPrefix(
  relPosix: string,
  prefixes: readonly string[]
): boolean {
  return prefixes.some(
    (prefix) => relPosix === prefix || relPosix.startsWith(prefix)
  );
}

export function isHistoricalNamePath(relPosix: string): boolean {
  return pathMatchesPrefix(relPosix, HISTORICAL_NAME_ALLOW_PREFIXES);
}
