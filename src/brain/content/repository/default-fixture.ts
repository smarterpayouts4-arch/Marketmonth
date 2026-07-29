import path from "node:path";

/**
 * Documented path for the checked-in zynava.com approved artifact.
 * Never use as a silent fallback when companyId/domain is missing —
 * callers must pass companyId (or an explicit fixturePath) themselves.
 */
export const DEFAULT_FIXTURE_RELATIVE =
  "data/companies/zynava.com/approved.csv" as const;

export const DEFAULT_FIXTURE_NAME = "approved.csv" as const;

/** Absolute path for filesystem loaders that already chose zynava.com. */
export function defaultFixtureAbsolute(
  cwd: string = process.cwd()
): string {
  return path.join(cwd, DEFAULT_FIXTURE_RELATIVE);
}
