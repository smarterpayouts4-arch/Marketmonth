import path from "node:path";

/** Checked-in Zynava discovery CSV — ingest helper into Brand Core (not doctrine). */
export const DEFAULT_FIXTURE_RELATIVE =
  "data/fixtures/zynava-discovery.csv" as const;

export const DEFAULT_FIXTURE_NAME = "zynava-discovery.csv" as const;

/** Absolute path for filesystem loaders. */
export function defaultFixtureAbsolute(
  cwd: string = process.cwd()
): string {
  return path.join(cwd, "data", "fixtures", DEFAULT_FIXTURE_NAME);
}
