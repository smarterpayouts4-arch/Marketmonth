/**
 * Canonical company-knowledge build — wraps the shared Discovery profile pipeline.
 * One crawl/clean/extract path; Analyze + publish both use this.
 */
import { evaluateDiscoveryAcceptance } from "../acceptance-gate";
import { buildDiscoveryProfileFromCorpus } from "../build-profile-from-corpus";
import type { BuildDiscoveryProfileInput } from "../build-profile-from-corpus/types";

import { brandProfileToCompanyKnowledge } from "./from-brand-profile";
import { computeKnowledgeHash } from "./knowledge-hash";
import {
  COMPANY_KNOWLEDGE_BUILD_VERSION,
  type CompanyKnowledgeBuild,
} from "./types";

export async function buildCompanyKnowledgeFromCorpus(
  input: BuildDiscoveryProfileInput
): Promise<CompanyKnowledgeBuild> {
  const build = await buildDiscoveryProfileFromCorpus(input);
  const knowledge = brandProfileToCompanyKnowledge(
    build.profile,
    build.evidence
  );
  const acceptance = evaluateDiscoveryAcceptance({
    profile: build.profile,
    evidence: build.evidence,
    corpus: input.corpus,
  });
  const knowledgeHash = computeKnowledgeHash({
    knowledge,
    evidence: build.evidence,
  });

  return {
    knowledge,
    profile: build.profile,
    evidence: build.evidence,
    acceptance,
    buildVersion: COMPANY_KNOWLEDGE_BUILD_VERSION,
    knowledgeHash,
    corpus: input.corpus,
  };
}

export {
  COMPANY_KNOWLEDGE_BUILD_VERSION,
  type CompanyKnowledge,
  type CompanyKnowledgeBuild,
  type IndexedProduct,
} from "./types";
export { computeKnowledgeHash } from "./knowledge-hash";
export { brandProfileToCompanyKnowledge } from "./from-brand-profile";
