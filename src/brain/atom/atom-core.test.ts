import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { BrandCore } from "@/brain/core/brand-core.schema";
import { resolveBrandCoreIdentity } from "@/brain/core/brand-core-identity";

import { wordSafeClamp } from "@/brain/lib/word-safe-clamp";

import {
  approveAtom,
  assertKernelImmutable,
  deriveLimitations,
  lockAtom,
} from "./approval";
import { buildAtomEnvelope } from "./build-envelope";
import {
  atomBuildKeyFromEnvelope,
  buildAtomBuildKey,
  hashEvidencePackage,
} from "./build-key";
import { compileAtomSkeleton } from "./compile";
import {
  ATOM_PROMPT_VERSION,
  computeMessageHash,
  isAtomBuildSuccessful,
  isAtomSpecialistReady,
  type ContentAtom,
} from "./content-atom.schema";
import { scoreHookQuality } from "./craft-score";
import { buildSelectedDirectionContract } from "./direction-contract";
import {
  admitEvidence,
  passesQualityFloor,
} from "./evidence-admission";
import { runEvidenceSufficiencyPreflight } from "./evidence-sufficiency";
import { frameworkPromiseUnfulfilled } from "./framework-promise";
import { validateClosedWorld } from "./validate/closed-world";
import {
  findAssertedBannedClaims,
  findClaimLikeFraming,
} from "./validate/banned-claims";
import { runAtomValidationPipeline } from "./validate";

function brandCore(overrides?: Partial<BrandCore>): BrandCore {
  return {
    version: "bc_test",
    brand_name: "Acme",
    domain: "acme.example",
    website: "https://acme.example",
    audience: { primary: "operators", segments: [] },
    positioning: "Clear decisions for busy teams",
    voice: "direct",
    offers: ["planning tools"],
    platform_capabilities: [],
    services: [],
    indexed_products: [],
    market_subjects: ["content planning"],
    proof_library: [
      {
        proof_id: "proof_a",
        type: "fact",
        summary: "Acme helps teams pick one monthly message",
      },
      {
        proof_id: "proof_b",
        type: "quote",
        summary: "Customers say planning feels clearer",
      },
    ],
    banned_claims: ["guaranteed results"],
    visual_identity: { style_notes: "clean" },
    psychology_principles: [],
    cta_rules: { preferred_actions: ["learn_more"] },
    ...overrides,
  };
}

const masterTopic = {
  id: "master_1",
  source: "automatic" as const,
  punchline: "Pick one message for the month",
  subheading: "",
  rationale: "",
  evidenceIds: ["proof_a"],
  confidence: "high" as const,
  safety: { status: "safe" as const, reasons: [] as string[] },
};

const variation = {
  id: "var_ps",
  angle: "problem_solution" as const,
  punchline: "Why scatter feels hard — and a clearer path",
  subheading: "Name the pain",
  brief: "Problem to relief for content planning",
  audienceProblem: "Scattered advice wastes attention",
  strategicPurpose: "Organize one next move",
  evidenceIds: ["proof_a", "proof_b"],
  assumptionIds: [] as string[],
  confidence: "high" as const,
  safety: { status: "safe" as const, reasons: [] as string[] },
};

describe("direction contract", () => {
  it("requires problem_solution elements and keeps faq question-led", () => {
    const ps = buildSelectedDirectionContract({ masterTopic, variation });
    assert.equal(ps.angle, "problem_solution");
    assert.ok(ps.requiredElements.includes("cause"));
    assert.ok(ps.requiredElements.includes("belief_shift"));
    assert.match(ps.requirementsText, /belief shift/i);

    const faq = buildSelectedDirectionContract({
      masterTopic,
      variation: { ...variation, id: "var_faq", angle: "faq" },
    });
    assert.ok(faq.requiredElements.includes("questions"));
    assert.match(faq.requirementsText, /question-led/i);
  });
});

describe("evidence sufficiency preflight", () => {
  it("returns ready when usable evidence meets angle minimum", () => {
    const core = brandCore();
    const contract = buildSelectedDirectionContract({ masterTopic, variation });
    const result = runEvidenceSufficiencyPreflight({ brandCore: core, contract });
    assert.equal(result.status, "ready");
    assert.ok(result.usableEvidenceIds.includes("proof_a"));
  });

  it("caps user_typed grounding at limited", () => {
    const core = brandCore();
    const contract = buildSelectedDirectionContract({
      masterTopic,
      variation,
      selectedTopicContext: {
        topicId: "t1",
        masterTitle: "Pick one message for the month",
        objective: "product_education",
        grounding: "user_typed",
        evidenceIds: ["proof_a", "proof_b"],
      },
    });
    const result = runEvidenceSufficiencyPreflight({ brandCore: core, contract });
    assert.equal(result.status, "limited");
  });

  it("returns insufficient on empty proof library", () => {
    const core = brandCore({ proof_library: [] });
    const contract = buildSelectedDirectionContract({
      masterTopic,
      variation: { ...variation, evidenceIds: [] },
    });
    const result = runEvidenceSufficiencyPreflight({ brandCore: core, contract });
    assert.equal(result.status, "insufficient");
  });

  it("returns direction_conflict when proof_ preferred ids miss the library", () => {
    const core = brandCore();
    const contract = buildSelectedDirectionContract({
      masterTopic: { ...masterTopic, evidenceIds: ["proof_missing"] },
      variation: { ...variation, evidenceIds: ["proof_missing"] },
    });
    const result = runEvidenceSufficiencyPreflight({ brandCore: core, contract });
    assert.equal(result.status, "direction_conflict");
  });

  it("falls back to library as limited when ev_ preferred ids miss", () => {
    const core = brandCore();
    const contract = buildSelectedDirectionContract({
      masterTopic: { ...masterTopic, evidenceIds: ["ev_foreign"] },
      variation: { ...variation, evidenceIds: ["ev_foreign"] },
    });
    const result = runEvidenceSufficiencyPreflight({ brandCore: core, contract });
    assert.equal(result.status, "limited");
    assert.ok(result.usableEvidenceIds.includes("proof_a"));
  });
});

describe("closed-world validation", () => {
  it("rejects fabricated citations", () => {
    const core = brandCore();
    const identity = resolveBrandCoreIdentity(core);
    const contract = buildSelectedDirectionContract({ masterTopic, variation });
    const preflight = runEvidenceSufficiencyPreflight({ brandCore: core, contract });
    const envelope = buildAtomEnvelope({
      brandCore: core,
      identity,
      contract,
      preflight,
    });
    const skeleton = compileAtomSkeleton(envelope);
    const dirty: ContentAtom = {
      ...skeleton,
      claimLedger: {
        ...skeleton.claimLedger,
        claims: [
          {
            claimId: "cl_fake",
            statement: "Invented claim",
            evidenceIds: ["MISSING_EVIDENCE"],
            classification: "observed",
            qualificationRequired: false,
          },
        ],
      },
      kernel: {
        ...skeleton.kernel,
        supporting_proof: [
          {
            proof_id: "fake",
            meaning: "nope",
            evidence_id: "fake",
          },
        ],
      },
    };
    dirty.message_hash = computeMessageHash(dirty);

    const violations = validateClosedWorld(dirty, envelope);
    assert.ok(violations.some((v) => v.code === "fabricated_citation"));

    const report = runAtomValidationPipeline({ atom: dirty, envelope });
    assert.equal(report.buildStatus, "invalid");
    assert.equal(report.ok, false);
  });

  it("allows negated banned claims and exempts belief_shift.from", () => {
    const asserted = [
      "we offer educational guidance rather than guaranteed results for teams",
    ]
      .join(" ")
      .toLowerCase();
    const hits = findAssertedBannedClaims(asserted, ["guaranteed results"]);
    assert.deepEqual(hits, []);

    const assertedBare = "this delivers guaranteed results every time";
    assert.ok(
      findAssertedBannedClaims(assertedBare, ["guaranteed results"]).length > 0
    );
  });

  it("does not treat misconception quotes of banned claims as assertions", () => {
    const core = brandCore();
    const identity = resolveBrandCoreIdentity(core);
    const contract = buildSelectedDirectionContract({ masterTopic, variation });
    const preflight = runEvidenceSufficiencyPreflight({ brandCore: core, contract });
    const envelope = buildAtomEnvelope({
      brandCore: core,
      identity,
      contract,
      preflight,
    });
    const skeleton = compileAtomSkeleton(envelope);
    const angle = skeleton.lineage.angle;
    const mod = skeleton.narrativeModules[angle];
    assert.ok(mod);
    const withMisconception: ContentAtom = {
      ...skeleton,
      narrativeModules: {
        ...skeleton.narrativeModules,
        [angle]: {
          ...mod,
          commonMisunderstandings: [
            {
              misunderstanding:
                "If I buy this, I’ll get guaranteed results every time.",
              correction:
                "ZYNAVA does not guarantee outcomes; guidance is educational only.",
            },
          ],
        },
      },
    };
    withMisconception.message_hash = computeMessageHash(withMisconception);
    const report = runAtomValidationPipeline({
      atom: withMisconception,
      envelope,
      selfAssessed: "limited",
    });
    assert.equal(
      report.violations.some((v) => v.code === "banned_claim_asserted"),
      false
    );
  });

  it("marks specialist readiness only after approve/lock", () => {
    const core = brandCore();
    const identity = resolveBrandCoreIdentity(core);
    const contract = buildSelectedDirectionContract({ masterTopic, variation });
    const preflight = runEvidenceSufficiencyPreflight({ brandCore: core, contract });
    const envelope = buildAtomEnvelope({
      brandCore: core,
      identity,
      contract,
      preflight,
    });
    const skeleton = compileAtomSkeleton(envelope);
    const report = runAtomValidationPipeline({
      atom: skeleton,
      envelope,
      selfAssessed: "limited",
    });
    assert.ok(isAtomBuildSuccessful(report.atom));
    assert.equal(isAtomSpecialistReady(report.atom), false);
  });
});

describe("application-owned status invariant", () => {
  it("selfAssessed complete cannot promote a thin skeleton above limited", () => {
    const core = brandCore();
    const identity = resolveBrandCoreIdentity(core);
    const contract = buildSelectedDirectionContract({ masterTopic, variation });
    const preflight = runEvidenceSufficiencyPreflight({ brandCore: core, contract });
    const envelope = buildAtomEnvelope({
      brandCore: core,
      identity,
      contract,
      preflight,
    });
    const skeleton = compileAtomSkeleton(envelope);
    const report = runAtomValidationPipeline({
      atom: skeleton,
      envelope,
      selfAssessed: "complete",
    });
    assert.notEqual(report.buildStatus, "complete");
    assert.ok(
      report.buildStatus === "limited" || report.buildStatus === "insufficient"
    );
  });

  it("selfAssessed insufficient demotes even when gates would allow limited", () => {
    const core = brandCore();
    const identity = resolveBrandCoreIdentity(core);
    const contract = buildSelectedDirectionContract({ masterTopic, variation });
    const preflight = runEvidenceSufficiencyPreflight({ brandCore: core, contract });
    const envelope = buildAtomEnvelope({
      brandCore: core,
      identity,
      contract,
      preflight,
    });
    const skeleton = compileAtomSkeleton(envelope);
    const report = runAtomValidationPipeline({
      atom: skeleton,
      envelope,
      selfAssessed: "insufficient",
    });
    assert.equal(report.buildStatus, "insufficient");
  });
});

describe("evidence admission quality floor", () => {
  it("rejects bare URLs, addresses, and single-token labels", () => {
    assert.equal(passesQualityFloor("https://example.com/x").ok, false);
    assert.equal(passesQualityFloor("123 Main Street Apt 4").ok, false);
    assert.equal(passesQualityFloor("Calcium").ok, false);
    assert.equal(
      passesQualityFloor("Acme helps teams pick one monthly message").ok,
      true
    );
  });

  it("never shrinks below prefer ∩ quality library and records rejects", () => {
    const result = admitEvidence({
      library: [
        {
          proof_id: "proof_a",
          type: "fact",
          summary: "Acme helps teams pick one monthly message",
        },
        {
          proof_id: "proof_url",
          type: "fact",
          summary: "https://example.com/only",
        },
        {
          proof_id: "proof_b",
          type: "quote",
          summary: "Customers say planning feels clearer with Acme",
        },
      ],
      preferIds: ["proof_a", "proof_url"],
      topicText: "Pick one message for the month",
      directionText: "Scattered advice wastes attention",
      ceiling: 8,
    });
    assert.ok(result.usableEvidenceIds.includes("proof_a"));
    assert.ok(result.rejected.some((r) => r.proof_id === "proof_url"));
    assert.ok(result.usableEvidenceIds.length >= 1);
  });
});

describe("claim-like framing", () => {
  it("flags comparative performance claims needing evidence", () => {
    const hits = findClaimLikeFraming([
      {
        path: "importantDistinctions",
        text: "This form is easier for most people to absorb.",
      },
      {
        path: "safe",
        text: "This content explains how to organize the comparison.",
      },
    ]);
    assert.ok(hits.some((h) => h.path === "importantDistinctions"));
    assert.equal(
      hits.some((h) => h.path === "safe"),
      false
    );
  });

  it("demotes atom status when framing appears without citation", () => {
    const core = brandCore();
    const identity = resolveBrandCoreIdentity(core);
    const contract = buildSelectedDirectionContract({ masterTopic, variation });
    const preflight = runEvidenceSufficiencyPreflight({ brandCore: core, contract });
    const envelope = buildAtomEnvelope({
      brandCore: core,
      identity,
      contract,
      preflight,
    });
    const skeleton = compileAtomSkeleton(envelope);
    const angle = skeleton.lineage.angle;
    const mod = skeleton.narrativeModules[angle];
    assert.ok(mod, "compiled skeleton should include angle narrative module");
    const dirty: ContentAtom = {
      ...skeleton,
      narrativeModules: {
        ...skeleton.narrativeModules,
        [angle]: {
          ...mod,
          importantDistinctions: [
            {
              thisIs:
                "This form is easier for most people to absorb than alternatives.",
              thisIsNot: "A one-size ranking of every option.",
            },
          ],
        },
      },
    };
    dirty.message_hash = computeMessageHash(dirty);
    const report = runAtomValidationPipeline({
      atom: dirty,
      envelope,
      selfAssessed: "complete",
    });
    assert.notEqual(report.buildStatus, "complete");
    assert.ok(
      report.gateResults.some((g) => g.gateId === "claim_like_framing") ||
        report.violations.some((v) => v.code === "claim_like_framing")
    );
  });
});

describe("build key idempotency", () => {
  it("same envelope + prompt yields the same AtomBuildKey", () => {
    const core = brandCore();
    const identity = resolveBrandCoreIdentity(core);
    const contract = buildSelectedDirectionContract({ masterTopic, variation });
    const preflight = runEvidenceSufficiencyPreflight({ brandCore: core, contract });
    const envelope = buildAtomEnvelope({
      brandCore: core,
      identity,
      contract,
      preflight,
    });
    const a = atomBuildKeyFromEnvelope(envelope, ATOM_PROMPT_VERSION);
    const b = atomBuildKeyFromEnvelope(envelope, ATOM_PROMPT_VERSION);
    assert.equal(a, b);
    assert.match(a, /^abk_/);
    const evidenceHash = hashEvidencePackage(
      envelope.evidence.map((e) => e.evidence_id)
    );
    const manual = buildAtomBuildKey({
      companyId: envelope.identity.company_id,
      brandCoreHash: envelope.identity.brand_core_hash,
      brandCoreVersion: envelope.identity.brand_core_version,
      topicId: envelope.topic.topicId ?? envelope.direction.topicId,
      directionId: envelope.direction.directionId,
      buildPolicyVersion: envelope.buildPolicyVersion,
      promptVersion: ATOM_PROMPT_VERSION,
      evidencePackageHash: evidenceHash,
    });
    assert.equal(a, manual);
  });
});

describe("approval rights + locked strategy immutability", () => {
  it("limited atom requires limitations acknowledgement to approve", () => {
    const core = brandCore();
    const identity = resolveBrandCoreIdentity(core);
    const contract = buildSelectedDirectionContract({ masterTopic, variation });
    const preflight = runEvidenceSufficiencyPreflight({ brandCore: core, contract });
    const envelope = buildAtomEnvelope({
      brandCore: core,
      identity,
      contract,
      preflight,
    });
    const skeleton = compileAtomSkeleton(envelope);
    const limitedAtom: ContentAtom = {
      ...skeleton,
      buildStatus: "limited",
      missing_information: ["thin_evidence_depth"],
    };
    limitedAtom.message_hash = computeMessageHash(limitedAtom);
    const denied = approveAtom(limitedAtom);
    assert.equal(denied.ok, false);
    const limitations = deriveLimitations(limitedAtom);
    assert.ok(limitations.includes("thin_evidence_depth"));
    const allowed = approveAtom(limitedAtom, {
      limitationsAcknowledgement: {
        acknowledgedAt: new Date().toISOString(),
        limitations,
      },
    });
    assert.equal(allowed.ok, true);
  });

  it("locked engagement.strategy mutation fails assertKernelImmutable", () => {
    const core = brandCore();
    const identity = resolveBrandCoreIdentity(core);
    const contract = buildSelectedDirectionContract({ masterTopic, variation });
    const preflight = runEvidenceSufficiencyPreflight({ brandCore: core, contract });
    const envelope = buildAtomEnvelope({
      brandCore: core,
      identity,
      contract,
      preflight,
    });
    const skeleton = compileAtomSkeleton(envelope);
    const base: ContentAtom = {
      ...skeleton,
      buildStatus: "limited",
      missing_information: ["thin_evidence_depth"],
      engagementBlueprint: {
        ...skeleton.engagementBlueprint,
        strategy: {
          internalAudienceTrigger: "scattered month planning",
          externalTriggerConcept: "one message",
          desiredConsumptionAction: "watch",
          actionFriction: "low",
          contentPayoff: { expectedValue: "clarity" },
          ethicalBoundaries: ["no fake guarantees"],
        },
      },
    };
    base.message_hash = computeMessageHash(base);
    const approved = approveAtom(base, {
      limitationsAcknowledgement: {
        acknowledgedAt: new Date().toISOString(),
        limitations: deriveLimitations(base),
      },
    });
    assert.equal(approved.ok, true);
    if (!approved.ok) return;
    const locked = lockAtom(approved.atom);
    assert.equal(locked.ok, true);
    if (!locked.ok) return;
    const strategy = locked.atom.engagementBlueprint.strategy;
    assert.ok(strategy);
    const mutated: ContentAtom = {
      ...locked.atom,
      engagementBlueprint: {
        ...locked.atom.engagementBlueprint,
        strategy: {
          ...strategy,
          internalAudienceTrigger: "mutated trigger after lock",
        },
      },
    };
    const check = assertKernelImmutable(locked.atom, mutated);
    assert.equal(check.ok, false);
  });
});

describe("framework promise + craft scores", () => {
  it("detects unfulfilled five-check promise", () => {
    assert.equal(
      wordSafeClamp(
        "After reviewing a Vitamin C product list you apply a five-check",
        40
      ).endsWith("…"),
      true
    );

    const core = brandCore();
    const identity = resolveBrandCoreIdentity(core);
    const contract = buildSelectedDirectionContract({ masterTopic, variation });
    const preflight = runEvidenceSufficiencyPreflight({
      brandCore: core,
      contract,
    });
    const envelope = buildAtomEnvelope({
      brandCore: core,
      identity,
      contract,
      preflight,
    });
    const skeleton = compileAtomSkeleton(envelope);
    const withPromise: ContentAtom = {
      ...skeleton,
      kernel: {
        ...skeleton.kernel,
        payoff:
          "You leave with five reusable checks that make comparisons consistent.",
        intended_action:
          "Choose two options and apply the five checks side by side, then save the checklist.",
      },
    };
    const gate = frameworkPromiseUnfulfilled(withPromise);
    assert.equal(gate.promised, 5);
    assert.equal(gate.unfulfilled, true);

    const report = runAtomValidationPipeline({
      atom: withPromise,
      envelope,
      selfAssessed: "limited",
    });
    assert.ok(
      report.statusReasons.some((r) => r.source === "framework_promise") ||
        report.warnings.some((w) => w.code === "framework_promise_unfulfilled")
    );
    assert.ok(report.craftReport);
    assert.ok(report.craftReport!.hookQuality >= 0);
    assert.ok(scoreHookQuality(withPromise) >= 0);
  });
});
