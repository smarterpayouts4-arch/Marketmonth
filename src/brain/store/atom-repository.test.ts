import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import {
  CONTENT_ATOM_SCHEMA_VERSION,
  computeMessageHash,
  type ContentAtom,
} from "@/brain/atom";

function sampleAtom(overrides?: Partial<ContentAtom>): ContentAtom {
  const base: ContentAtom = {
    schemaVersion: CONTENT_ATOM_SCHEMA_VERSION,
    atom_id: "atom_test_1",
    atom_version: 1,
    message_hash: "pending",
    lineage: {
      companyId: "zynava.com",
      selectedDirectionId: "dir_1",
      brandCoreId: "bc_1",
      brandCoreHash: "hash_1",
      brandCoreVersion: 1,
      masterTitle: "Master topic",
      angle: "faq",
    },
    kernel: {
      audience_state: "Curious shopper",
      audience_problem: "Hard to trust claims",
      why_problem_exists: "Mixed signals online create doubt for careful buyers",
      core_tension: "Want clarity without hype",
      central_claim: {
        claim_id: "c1",
        meaning: "Evidence-first clarity wins",
        canonical_wording: "Evidence-first clarity wins",
        claim_type: "inferred",
      },
      belief_shift: { from: "All brands exaggerate", to: "Some prove it" },
      resolution: "Show verifiable proof",
      payoff: "Confident choice",
      supporting_proof: [
        {
          proof_id: "ev_1",
          meaning: "Independent lab note",
          evidence_id: "ev_1",
        },
      ],
      intended_action: "Compare proof",
      hook_strategy: {
        family: "curiosity_gap",
        planted_question: "What do labs actually show?",
        resolution: "A short proof trail",
        opening_intent: "Open with the missing proof",
      },
    },
    narrativeModules: {
      faq: {
        keyQuestion: "What do labs actually show?",
        supportingPoints: [
          {
            point: "Independent lab note",
            explanation: "A verifiable trail beats hype",
            evidence_id: "ev_1",
          },
        ],
        importantDistinctions: [
          {
            thisIs: "A proof-led FAQ",
            thisIsNot: "A promotional pitch",
          },
        ],
        commonMisunderstandings: [],
        framework: [],
        steps: [],
        comparisonCriteria: [],
        objections: [],
        canonicalNarrativeSpine: {
          triggerConcept: "Missing proof",
          setup: "Shoppers doubt claims",
          problem: "Hard to trust claims",
          explanation: "Mixed signals online",
          keyInsight: "Evidence-first clarity wins",
          resolution: "Show verifiable proof",
          takeaway: "Confident choice",
        },
      },
    },
    engagementBlueprint: {
      creative_mode: "educational_explanation",
      visual_concept: "Clean proof cards",
      strategy: {
        internalAudienceTrigger: "Hard to trust claims",
        externalTriggerConcept: "What do labs actually show?",
        desiredConsumptionAction: "understand_then_decide",
        actionFriction: "Too many unverified claims",
        contentPayoff: { expectedValue: "Confident choice" },
        ethicalBoundaries: ["Do not invent evidence"],
      },
    },
    claimLedger: {
      claims: [
        {
          claimId: "cl_1",
          statement: "Evidence-first clarity wins",
          evidenceIds: ["ev_1"],
          classification: "inferred",
          qualificationRequired: false,
        },
      ],
      evidenceRefs: ["ev_1"],
      missingInformation: [],
      complianceNotes: [],
      forbiddenClaims: [],
      mustNotImply: ["guaranteed results"],
    },
    distributionContract: {
      intended_channels: ["youtube_short"],
      channel_neutrality: true,
      requiredInvariants: ["Stay within envelope evidence"],
      adaptableElements: ["visual presentation hints"],
      brandVoiceConstraints: ["clear"],
      prohibitedInterpretations: [],
      mustNotImply: ["guaranteed results"],
      ctaBoundaries: [],
    },
    buildStatus: "complete",
    approvalStatus: "unreviewed",
    safety: {
      banned_claims: [],
      required_qualifiers: [],
      compliance_flags: [],
      allowed_evidence_ids: ["ev_1"],
    },
    missing_information: [],
  };
  const atom = { ...base, ...overrides };
  return { ...atom, message_hash: computeMessageHash(atom) };
}

describe("AtomRepository JSON adapter", () => {
  let prevCwd: string;
  let tempRoot: string;
  let prevDbUrl: string | undefined;

  before(() => {
    prevCwd = process.cwd();
    prevDbUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    tempRoot = mkdtempSync(path.join(tmpdir(), "mm-atom-repo-"));
    process.chdir(tempRoot);
  });

  after(() => {
    process.chdir(prevCwd);
    if (prevDbUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevDbUrl;
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("saves, loads latest, and updates approval with revision concurrency", async () => {
    const { createJsonAtomRepository } = await import(
      "./json-atom-repository"
    );
    const repo = createJsonAtomRepository();
    const saved = await repo.save(sampleAtom());
    assert.equal(saved.record_revision, 1);
    assert.equal(saved.atom.approvalStatus, "unreviewed");

    const loaded = await repo.getById("atom_test_1", "zynava.com");
    assert.ok(loaded);
    assert.equal(loaded!.atom.atom_id, "atom_test_1");

    const approved = await repo.updateApproval({
      atomId: "atom_test_1",
      companyId: "zynava.com",
      action: "approve",
      expectedRevision: saved.record_revision,
    });
    assert.equal(approved.atom.approvalStatus, "locked");
    assert.ok(approved.record_revision > saved.record_revision);

    await assert.rejects(
      () =>
        repo.updateApproval({
          atomId: "atom_test_1",
          companyId: "zynava.com",
          action: "reject",
          expectedRevision: saved.record_revision,
        }),
      /Revision conflict/
    );
  });

  it("falls back to JSON store when DB reports missing content_atoms table", async () => {
    const { classifyPgError } = await import("@/db/pg-errors");
    const { __createAtomRepositoryTestables } = await import(
      "./create-atom-repository"
    );
    const { createJsonAtomRepository } = await import(
      "./json-atom-repository"
    );

    const drizzleShaped = Object.assign(
      new Error('Failed query: select "record" from "content_atoms"'),
      {
        cause: Object.assign(new Error('relation "content_atoms" does not exist'), {
          code: "42P01",
        }),
      }
    );
    const classified = classifyPgError(drizzleShaped);
    assert.equal(classified.reason, "missing_table");
    assert.equal(classified.code, "42P01");

    let calls = 0;
    const failingPrimary = {
      async save() {
        calls += 1;
        throw drizzleShaped;
      },
      async getById() {
        throw drizzleShaped;
      },
      async getLatest() {
        throw drizzleShaped;
      },
      async findLatestByAtomId() {
        throw drizzleShaped;
      },
      async findUnlockedByBuildKey() {
        throw drizzleShaped;
      },
      async updateApproval() {
        throw drizzleShaped;
      },
    };

    const wrapped =
      __createAtomRepositoryTestables.withMissingTableFallback(
        failingPrimary as never
      );
    const saved = await wrapped.save(sampleAtom({ atom_id: "atom_fallback_1" }));
    assert.equal(saved.atom.atom_id, "atom_fallback_1");
    assert.ok(calls >= 1);

    // Subsequent calls use JSON and succeed without rethrowing.
    const loaded = await wrapped.getById("atom_fallback_1", "zynava.com");
    assert.ok(loaded);
    assert.equal(loaded!.atom.atom_id, "atom_fallback_1");

    // Sanity: JSON repo itself still works in this temp cwd.
    const json = createJsonAtomRepository();
    const again = await json.getById("atom_fallback_1", "zynava.com");
    assert.ok(again);
  });
});
