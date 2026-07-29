import { join } from "node:path";

import { artifactDiskPath } from "./artifact-store";

/**
 * Company-scoped on-disk paths for discovery artifacts and reconcile metadata.
 * Prefer `artifactDiskPath` / `readCompanyProfile` for CSV reads.
 */
export function companyArtifactPaths(
  companyId: string,
  cwd = process.cwd()
) {
  const slug = companyId
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/[^a-z0-9._-]+/g, "-");
  const companyDir = join(cwd, "data", "companies", slug);
  const reconcile = join(cwd, "data", "runtime", "discovery-reconcile");
  return {
    companyId: slug,
    companyDir,
    approvedCsv: artifactDiskPath(slug, "approved"),
    draftCsv: artifactDiskPath(slug, "draft"),
    proposedCsv: join(companyDir, "proposed.csv"),
    overridesJson: join(companyDir, "overrides.json"),
    frozenCorpusDir: join(
      cwd,
      "data",
      "runtime",
      "discovery-pages",
      slug
    ),
    approveMeta: join(reconcile, "approval-meta.json"),
    neonPublishMeta: join(reconcile, "neon-publish-meta.json"),
    ideaLabSmoke: join(reconcile, "idea-lab-smoke.json"),
  };
}
