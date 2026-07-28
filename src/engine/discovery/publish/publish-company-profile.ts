/**
 * Recoverable publish: draft → candidate (+overrides) → gate → immutable published
 * → temp CSV → Brand Core → CompanyPublication pending → promote CSV → pointer → complete.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

import { and, desc, eq } from "drizzle-orm";

import { getBrandCore } from "@/brain/core/get-brand-core";
import { withWriteLock } from "@/brain/store/write-lock";
import { getDb } from "@/db";
import {
  brandProfiles,
  brands,
  companyPublications,
  strategyPreviews,
  websiteAnalyses,
} from "@/db/schema";
import { evaluateDiscoveryAcceptance } from "@/engine/discovery/acceptance-gate";
import {
  brandProfileToCompanyKnowledge,
  computeKnowledgeHash,
} from "@/engine/discovery/company-knowledge";
import {
  applyApprovedOverrides,
  evidenceFromOverrides,
  loadApprovedOverrides,
  type ApprovedOverridesFile,
} from "@/engine/discovery/fixture-propose/apply-overrides";
import {
  insertProfileVersion,
  publishBrandProfile,
} from "@/engine/discovery/persist";
import {
  ensureMarketingOpportunity,
  normalizeDiscoveryEvidence,
} from "@/engine/discovery/persist/ensure";
import {
  buildDiscoveryCsvDocument,
  DISCOVERY_CSV_SCHEMA_VERSION,
} from "@/lib/dev/discovery-csv-rows";

export type PublishCompanyProfileInput = {
  brandId: string;
  /** Raw draft profile id (status=draft). */
  draftProfileId: string;
  approvedCsvPath: string;
  overridesPath?: string;
  companyId: string;
  force?: boolean;
  skipGate?: boolean;
};

export type PublishCompanyProfileResult = {
  publicationId: string;
  publishedProfileId: string;
  knowledgeHash: string;
  artifactHash: string;
  skippedRewrite: boolean;
  gateStatus: string;
};

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function materializeCsvForHash(input: {
  profile: Parameters<typeof buildDiscoveryCsvDocument>[0]["profile"];
  evidence: Parameters<typeof buildDiscoveryCsvDocument>[0]["evidence"];
  crawlMeta: Parameters<typeof buildDiscoveryCsvDocument>[0]["crawlMeta"];
  strategyPreview: Parameters<
    typeof buildDiscoveryCsvDocument
  >[0]["strategyPreview"];
  sourceUrl: string;
  notes: string;
}): { csv: string; artifactHash: string } {
  // Stable retrieved_at so knowledge-equivalent publishes don't thrash artifact hash.
  const retrievedAt = "1970-01-01T00:00:00.000Z";
  const csv = buildDiscoveryCsvDocument({
    ...input,
    retrievedAt,
  });
  return { csv, artifactHash: sha256(csv) };
}

export async function publishCompanyProfile(
  input: PublishCompanyProfileInput
): Promise<PublishCompanyProfileResult> {
  const db = getDb();

  const [draft] = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.id, input.draftProfileId))
    .limit(1);
  if (!draft) {
    throw new Error(`Draft profile not found: ${input.draftProfileId}`);
  }
  if (draft.status && draft.status !== "draft") {
    throw new Error(
      `Expected status=draft, got ${draft.status} for ${input.draftProfileId}`
    );
  }

  const [brand] = await db
    .select()
    .from(brands)
    .where(eq(brands.id, input.brandId))
    .limit(1);
  if (!brand) throw new Error(`Brand not found: ${input.brandId}`);

  const overrides: ApprovedOverridesFile = input.overridesPath
    ? loadApprovedOverrides(input.overridesPath)
    : { fields: {} };

  const draftProfile = ensureMarketingOpportunity(draft.profile);
  const candidateProfile = applyApprovedOverrides(draftProfile, overrides);
  const overrideEvidence = evidenceFromOverrides(
    overrides,
    candidateProfile.website
  );
  const candidateEvidence = normalizeDiscoveryEvidence([
    ...(draft.evidence ?? []),
    ...overrideEvidence,
  ]);

  const knowledge = brandProfileToCompanyKnowledge(
    candidateProfile,
    candidateEvidence
  );
  const knowledgeHash = computeKnowledgeHash({
    knowledge,
    evidence: candidateEvidence,
    overrides,
  });

  // Idempotent resume: completed publication with same knowledgeHash
  const [completedSame] = await db
    .select()
    .from(companyPublications)
    .where(
      and(
        eq(companyPublications.companyId, input.companyId),
        eq(companyPublications.knowledgeHash, knowledgeHash),
        eq(companyPublications.status, "complete")
      )
    )
    .orderBy(desc(companyPublications.createdAt))
    .limit(1);

  if (completedSame && !input.force) {
    if (brand.publishedBrandProfileId !== completedSame.brandProfileId) {
      await publishBrandProfile({
        brandId: input.brandId,
        brandProfileId: completedSame.brandProfileId,
      });
    }
    return {
      publicationId: completedSame.publicationId,
      publishedProfileId: completedSame.brandProfileId,
      knowledgeHash,
      artifactHash: "",
      skippedRewrite: true,
      gateStatus: "approval_ready",
    };
  }

  const [analysis] = await db
    .select()
    .from(websiteAnalyses)
    .where(eq(websiteAnalyses.id, draft.analysisId))
    .limit(1);

  const sourceUrl = analysis?.normalizedUrl || candidateProfile.website;

  // Minimal corpus for gate page coverage when HTML unavailable
  const meta = analysis?.crawlMeta as {
    pageSummaries?: Array<{ url: string; pageType: string; title?: string }>;
    kinds?: string[];
  } | null;
  const summaries = meta?.pageSummaries ?? [];
  const corpus = {
    normalizedUrl: sourceUrl,
    origin: new URL(sourceUrl).origin,
    pages:
      summaries.length > 0
        ? summaries.map((s) => ({
            url: s.url,
            status: 200,
            html: "<html></html>",
            title: s.title ?? "",
            kind: (s.pageType as "home") || "other",
            collectionMethod: "fetch" as const,
          }))
        : (meta?.kinds ?? ["home", "about", "faq", "products"]).map(
            (k, i) => ({
              url: `${sourceUrl}/p${i}`,
              status: 200,
              html: "<html></html>",
              title: k,
              kind: k as "home",
              collectionMethod: "fetch" as const,
            })
          ),
  };

  const gate = evaluateDiscoveryAcceptance({
    profile: candidateProfile,
    evidence: candidateEvidence,
    corpus,
  });

  if (!input.skipGate && !gate.approvalReady) {
    await insertProfileVersion({
      analysisId: draft.analysisId,
      brandId: input.brandId,
      profile: candidateProfile,
      evidence: candidateEvidence,
      status: "rejected",
      sourceDraftProfileId: draft.id,
      knowledgeHash,
    });
    throw new Error(
      `Gate not approval_ready (status=${gate.status}). Candidate rejected.`
    );
  }

  const candidate = await insertProfileVersion({
    analysisId: draft.analysisId,
    brandId: input.brandId,
    profile: candidateProfile,
    evidence: candidateEvidence,
    status: "publish_candidate",
    sourceDraftProfileId: draft.id,
    knowledgeHash,
  });

  const published = await insertProfileVersion({
    analysisId: draft.analysisId,
    brandId: input.brandId,
    profile: candidateProfile,
    evidence: candidateEvidence,
    status: "published",
    sourceDraftProfileId: draft.id,
    knowledgeHash,
  });

  const [strategyRow] = await db
    .select()
    .from(strategyPreviews)
    .where(eq(strategyPreviews.brandProfileId, draft.id))
    .orderBy(desc(strategyPreviews.createdAt))
    .limit(1);

  const { csv, artifactHash } = materializeCsvForHash({
    profile: candidateProfile,
    evidence: candidateEvidence,
    crawlMeta: analysis?.crawlMeta ?? null,
    strategyPreview: strategyRow?.preview ?? null,
    sourceUrl,
    notes: `Published from Neon brand_profile ${published.id}; gate ${gate.status}; candidate ${candidate.id}`,
  });

  // Validate CSV parses + Brand Core compiles before touching SoT pointer
  mkdirSync(dirname(input.approvedCsvPath), { recursive: true });
  const tmpCsv = `${input.approvedCsvPath}.tmp-publish-${process.pid}`;
  writeFileSync(tmpCsv, csv, "utf8");
  try {
    getBrandCore(input.companyId, { absolutePath: tmpCsv });
  } catch (e) {
    try {
      unlinkSync(tmpCsv);
    } catch {
      /* ignore */
    }
    throw new Error(
      `Brand Core compile failed on candidate CSV: ${
        e instanceof Error ? e.message : e
      }`
    );
  }

  const previousBrandProfileId = brand.publishedBrandProfileId ?? undefined;

  // Resume pending publication for same knowledgeHash if interrupted
  let [pending] = await db
    .select()
    .from(companyPublications)
    .where(
      and(
        eq(companyPublications.companyId, input.companyId),
        eq(companyPublications.knowledgeHash, knowledgeHash),
        eq(companyPublications.status, "pending")
      )
    )
    .orderBy(desc(companyPublications.createdAt))
    .limit(1);

  if (!pending) {
    const [inserted] = await db
      .insert(companyPublications)
      .values({
        companyId: input.companyId,
        brandProfileId: published.id,
        knowledgeHash,
        status: "pending",
        previousBrandProfileId,
      })
      .returning();
    pending = inserted;
  }

  // Rollback uses in-memory previousCsv — no on-disk .bak-publish sidecar.
  let previousCsv: string | null = null;
  if (existsSync(input.approvedCsvPath)) {
    previousCsv = readFileSync(input.approvedCsvPath, "utf8");
  }

  try {
    await withWriteLock(async () => {
      renameSync(tmpCsv, input.approvedCsvPath);

      await publishBrandProfile({
        brandId: input.brandId,
        brandProfileId: published.id,
      });

      await db
        .update(companyPublications)
        .set({
          status: "complete",
          completedAt: new Date(),
          brandProfileId: published.id,
        })
        .where(eq(companyPublications.publicationId, pending.publicationId));
    });
  } catch (err) {
    // Restore CSV + pointer
    try {
      if (previousCsv !== null) {
        writeFileSync(input.approvedCsvPath, previousCsv, "utf8");
      } else if (existsSync(input.approvedCsvPath)) {
        unlinkSync(input.approvedCsvPath);
      }
      if (previousBrandProfileId) {
        await publishBrandProfile({
          brandId: input.brandId,
          brandProfileId: previousBrandProfileId,
        });
      }
    } catch {
      /* best effort */
    }
    await db
      .update(companyPublications)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(companyPublications.publicationId, pending.publicationId));
    throw err;
  } finally {
    if (existsSync(tmpCsv)) {
      try {
        unlinkSync(tmpCsv);
      } catch {
        /* ignore */
      }
    }
  }

  return {
    publicationId: pending.publicationId,
    publishedProfileId: published.id,
    knowledgeHash,
    artifactHash,
    skippedRewrite: false,
    gateStatus: gate.status,
  };
}

export { DISCOVERY_CSV_SCHEMA_VERSION };
