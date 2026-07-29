import type { ContentBrainContext } from "@/brain/content/types";
import { recordProvenance, type ProvenanceBranch } from "@/lib/provenance";

import {
  readArtifact,
  readArtifactAsync,
  type ArtifactState,
} from "./artifact-store";
import {
  parseCompanyCsv,
  type DiscoveryCsvContractIssue,
} from "./csv-contract";
import type { CompanyProfileProjection } from "./projection.schema";
import { projectionToBrainContext } from "./to-brain-context";

export type ReadCompanyProfileOptions = {
  state?: ArtifactState;
  /** Attribute this read to a branch in the provenance log. */
  branch?: ProvenanceBranch;
  step?: string;
};

function toProjection(
  companyId: string,
  state: ArtifactState,
  text: string | null,
  options: ReadCompanyProfileOptions
): CompanyProfileProjection {
  if (!text) {
    throw new Error(
      `readCompanyProfile: no ${state} artifact for companyId "${companyId}"`
    );
  }
  const projection = parseCompanyCsv(text);
  if (options.branch) {
    recordProvenance({
      branch: options.branch,
      step: options.step ?? "readCompanyProfile",
      companyId,
      source: state === "approved" ? "artifact:approved" : "artifact:draft",
      artifactHash: projection.artifactHash,
      detail: {
        evidenceRows: projection.evidence.length,
        faqs: projection.faqs.length,
        offers: projection.offers.length,
        headings: projection.signals.headings.length,
      },
    });
  }
  return projection;
}

/**
 * Sole reader for company profile artifacts.
 * Both Branch A (activation) and Branch B (topics) must go through this.
 *
 * Disk only — safe for scripts, tests and dev. Server code that can run on a
 * read-only filesystem must use `readCompanyProfileAsync`.
 */
export function readCompanyProfile(
  companyId: string,
  options: ReadCompanyProfileOptions = {}
): CompanyProfileProjection {
  const state = options.state ?? "approved";
  return toProjection(companyId, state, readArtifact(companyId, state), options);
}

/** Disk, then the DB mirror. Use this from anything that runs deployed. */
export async function readCompanyProfileAsync(
  companyId: string,
  options: ReadCompanyProfileOptions = {}
): Promise<CompanyProfileProjection> {
  const state = options.state ?? "approved";
  return toProjection(
    companyId,
    state,
    await readArtifactAsync(companyId, state),
    options
  );
}

export function tryReadCompanyProfile(
  companyId: string,
  options: ReadCompanyProfileOptions = {}
): CompanyProfileProjection | null {
  try {
    return readCompanyProfile(companyId, options);
  } catch {
    return null;
  }
}

export async function tryReadCompanyProfileAsync(
  companyId: string,
  options: ReadCompanyProfileOptions = {}
): Promise<CompanyProfileProjection | null> {
  try {
    return await readCompanyProfileAsync(companyId, options);
  } catch {
    return null;
  }
}

export function readCompanyProfileAsBrainContext(
  companyId: string,
  options: ReadCompanyProfileOptions = {}
): ContentBrainContext {
  return projectionToBrainContext(readCompanyProfile(companyId, options));
}

export async function readCompanyProfileAsBrainContextAsync(
  companyId: string,
  options: ReadCompanyProfileOptions = {}
): Promise<ContentBrainContext> {
  return projectionToBrainContext(
    await readCompanyProfileAsync(companyId, options)
  );
}

export type { DiscoveryCsvContractIssue };
