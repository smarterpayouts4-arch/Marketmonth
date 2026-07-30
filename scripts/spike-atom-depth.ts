/**
 * SPIKE — constrained-LLM Content Atom depth (runs BEFORE the atom pipeline is built).
 *
 * Question it answers: can a nano-tier model, given ONLY a closed envelope of
 * real Brand Core evidence IDs, produce a genuinely deep atom kernel — and
 * honestly degrade to limited/insufficient on a thin corpus — without
 * fabricating citations?
 *
 * This is throwaway benchmark code for the Canonical Content Atom plan
 * (Phase 1 opening spike). It is NOT product code and imports no atom pipeline.
 *
 * Usage:
 *   npx tsx scripts/spike-atom-depth.ts            # all three fixtures
 *   npx tsx scripts/spike-atom-depth.ts zynava.com # one fixture
 *
 * Requires OPENAI_API_KEY in .env.local. Writes a JSON report to
 * data/runtime/spike-atom-depth-report.json and prints a verdict per fixture.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getBrandCoreRepository } from "../src/brain/core/brand-core-repository";
import { callBrainLlm } from "../src/brain/llm/openai-client";

// Plan decision: the atom compiler runs on the nano family. contentAtomLlm's
// registry default is still gpt-4o-mini pre-build, so the spike pins nano
// explicitly (env override respected).
const SPIKE_MODEL =
  process.env.OPENAI_CONTENT_BRAIN_MODEL?.trim() || "gpt-5.4-nano";

const FIXTURES = ["zynava.com", "clearflowplumbing.example", "thin-signal.example"];

/** Known v1 hollow-atom artifacts — their presence means template echo, not generation. */
const TEMPLATE_ECHOES = [
  "i need more disconnected content ideas",
  "one clear idea can power a coherent content system",
  "a practical starting guide to",
];

type SpikeClaim = {
  text: string;
  evidence_id: string;
  claim_type: "observed" | "inferred" | "recommended";
};

type SpikeAtomKernel = {
  audience_state: string;
  audience_problem: string;
  why_problem_exists: string;
  core_tension: string;
  central_claim: string;
  belief_shift: { from: string; to: string };
  resolution: string;
  payoff: string;
  supporting_claims: SpikeClaim[];
  missing_information: string[];
  self_assessed_status: "complete" | "limited" | "insufficient";
};

const KERNEL_JSON_SCHEMA = {
  name: "spike_atom_kernel",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "audience_state",
      "audience_problem",
      "why_problem_exists",
      "core_tension",
      "central_claim",
      "belief_shift",
      "resolution",
      "payoff",
      "supporting_claims",
      "missing_information",
      "self_assessed_status",
    ],
    properties: {
      audience_state: { type: "string" },
      audience_problem: { type: "string" },
      why_problem_exists: { type: "string" },
      core_tension: { type: "string" },
      central_claim: { type: "string" },
      belief_shift: {
        type: "object",
        additionalProperties: false,
        required: ["from", "to"],
        properties: { from: { type: "string" }, to: { type: "string" } },
      },
      resolution: { type: "string" },
      payoff: { type: "string" },
      supporting_claims: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["text", "evidence_id", "claim_type"],
          properties: {
            text: { type: "string" },
            evidence_id: { type: "string" },
            claim_type: {
              type: "string",
              enum: ["observed", "inferred", "recommended"],
            },
          },
        },
      },
      missing_information: { type: "array", items: { type: "string" } },
      self_assessed_status: {
        type: "string",
        enum: ["complete", "limited", "insufficient"],
      },
    },
  },
};

const SYSTEM_PROMPT = [
  "You are a strategic content architect operating in a CLOSED WORLD.",
  "You receive a brand envelope containing evidence items, each with an evidence_id.",
  "Hard rules:",
  "1. Every supporting claim MUST cite exactly one evidence_id that appears in the envelope. Never invent an evidence_id and never use placeholder IDs like MISSING_EVIDENCE — if no envelope evidence supports a claim, do not emit that claim at all. supporting_claims may be an empty array.",
  "2. Assert only what the cited evidence supports. If evidence merely suggests something, mark the claim inferred; if it is advice, mark it recommended.",
  "3. Never use the brand's banned claim phrases.",
  "4. If the evidence cannot support a deep, specific atom for this topic and angle, say so: list what is missing in missing_information and set self_assessed_status to limited or insufficient. An honest thin answer beats confident filler.",
  "5. Be specific to THIS brand, THIS audience, THIS topic. Generic marketing prose that could apply to any company is a failure.",
  "6. belief_shift.from is what the audience currently believes; belief_shift.to is the specific new belief this content should create. They must be substantively different and topic-specific.",
  "Respond with JSON matching the provided schema.",
].join("\n");

type FixtureResult = {
  domain: string;
  model: string;
  topic: string;
  angle: string;
  evidenceCount: number;
  status: "ok" | "load_failed" | "llm_failed" | "parse_failed";
  detail?: string;
  latencyMs?: number;
  tokens?: number;
  kernel?: SpikeAtomKernel;
  checks?: Record<string, { pass: boolean; note: string }>;
  verdict?: "PASS" | "FAIL";
};

function deriveTopic(brandCore: {
  market_subjects: string[];
  offers: string[];
  positioning: string;
}): string {
  return (
    brandCore.market_subjects[0] ||
    brandCore.offers[0] ||
    brandCore.positioning.slice(0, 80)
  );
}

function wordOverlap(a: string, b: string): boolean {
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 5)
    );
  const wa = words(a);
  for (const w of words(b)) if (wa.has(w)) return true;
  return false;
}

async function runFixture(domain: string): Promise<FixtureResult> {
  const base: FixtureResult = {
    domain,
    model: SPIKE_MODEL,
    topic: "",
    angle: "problem_solution",
    evidenceCount: 0,
    status: "ok",
  };

  let core;
  try {
    core = getBrandCoreRepository().getBrandCore(domain);
  } catch (err) {
    return {
      ...base,
      status: "load_failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  const brandCore = core.brandCore;
  const evidence = brandCore.proof_library.map((p) => ({
    evidence_id: p.proof_id,
    type: p.type,
    summary: p.summary,
  }));
  const evidenceIds = new Set(evidence.map((e) => e.evidence_id));
  const topic = deriveTopic(brandCore);
  base.topic = topic;
  base.evidenceCount = evidence.length;

  const envelope = {
    brand: {
      name: brandCore.brand_name,
      domain: brandCore.domain,
      positioning: brandCore.positioning,
      voice: brandCore.voice,
      audience_primary: brandCore.audience.primary,
    },
    banned_claims: brandCore.banned_claims,
    selected_topic: topic,
    selected_direction: {
      angle: "problem_solution",
      requirements:
        "Name the audience problem, why it exists (cause), what it costs them (consequence), the resolution, and the belief shift.",
    },
    evidence,
  };

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ...base, status: "llm_failed", detail: "OPENAI_API_KEY missing" };
  }

  const startedAt = Date.now();
  const result = await callBrainLlm({
    apiKey,
    model: SPIKE_MODEL,
    system: SYSTEM_PROMPT,
    user: JSON.stringify(envelope),
    jsonSchema: KERNEL_JSON_SCHEMA,
    timeoutMs: 90_000,
    maxRetries: 1,
    costScope: { companyId: core.identity.company_id },
  });
  const latencyMs = Date.now() - startedAt;

  if (!result.ok) {
    return {
      ...base,
      status: "llm_failed",
      detail: `${result.reason}: ${result.detail}`,
      latencyMs,
    };
  }

  let kernel: SpikeAtomKernel;
  try {
    kernel = JSON.parse(result.raw) as SpikeAtomKernel;
  } catch {
    return {
      ...base,
      status: "parse_failed",
      detail: result.raw.slice(0, 300),
      latencyMs,
    };
  }

  // --- Validation gates (a preview of the real atom validation pipeline) ---
  const checks: Record<string, { pass: boolean; note: string }> = {};

  const fabricated = kernel.supporting_claims.filter(
    (c) => !evidenceIds.has(c.evidence_id)
  );
  checks.no_fabricated_citations = {
    pass: fabricated.length === 0,
    note:
      fabricated.length === 0
        ? `${kernel.supporting_claims.length} claims, all cite real envelope IDs`
        : `FABRICATED: ${fabricated.map((c) => c.evidence_id).join(", ")}`,
  };

  // belief_shift.from is deliberately excluded: it is the belief being
  // challenged, so banned phrases may legitimately appear there.
  const assertedText = [
    kernel.audience_state,
    kernel.audience_problem,
    kernel.why_problem_exists,
    kernel.core_tension,
    kernel.central_claim,
    kernel.belief_shift.to,
    kernel.resolution,
    kernel.payoff,
    ...kernel.supporting_claims.map((c) => c.text),
  ]
    .join(" \n ")
    .toLowerCase();

  // Assertion-level check: a banned phrase used in negation ("does not
  // guarantee results", "rather than guaranteed results") is the model
  // DISPELLING the claim — desired behavior, not a violation. The real atom
  // validation pipeline needs this same distinction.
  const NEGATION_MARKERS =
    /(?:\bnot?\b|\bnever\b|\bwithout\b|\brather than\b|\binstead of\b|n[o']t\b|\bwon't\b|\bdoesn't\b|\bdoes not\b|\bisn't\b|\baren't\b|\bavoid\b|\bno\b)/;
  const bannedHits = brandCore.banned_claims.filter((b) => {
    const phrase = b.toLowerCase();
    let idx = assertedText.indexOf(phrase);
    while (idx !== -1) {
      const preceding = assertedText.slice(Math.max(0, idx - 40), idx);
      if (!NEGATION_MARKERS.test(preceding)) return true; // asserted, not dispelled
      idx = assertedText.indexOf(phrase, idx + phrase.length);
    }
    return false;
  });
  checks.no_banned_claims = {
    pass: bannedHits.length === 0,
    note:
      bannedHits.length === 0
        ? "no banned claim asserted (negated/dispelling usage allowed)"
        : `asserted: ${bannedHits.join(", ")}`,
  };

  const fullText = `${assertedText} \n ${kernel.belief_shift.from.toLowerCase()}`;
  const echoes = TEMPLATE_ECHOES.filter((t) => fullText.includes(t));
  checks.no_template_echo = {
    pass: echoes.length === 0,
    note: echoes.length === 0 ? "no v1 hollow-atom artifacts" : echoes.join("; "),
  };

  const distinctFields = new Set([
    kernel.audience_state.trim(),
    kernel.audience_problem.trim(),
    kernel.core_tension.trim(),
  ]);
  const shiftDiffers =
    kernel.belief_shift.from.trim().toLowerCase() !==
    kernel.belief_shift.to.trim().toLowerCase();
  checks.fields_not_cloned = {
    pass: distinctFields.size === 3 && shiftDiffers,
    note:
      distinctFields.size === 3 && shiftDiffers
        ? "audience/problem/tension distinct; belief shift moves"
        : "identical field text detected (v1 hollow-atom pattern)",
  };

  const depthOk =
    kernel.why_problem_exists.trim().length >= 40 &&
    kernel.core_tension.trim().length >= 40 &&
    kernel.central_claim.trim().length >= 20;
  checks.depth_minimums = {
    pass: depthOk,
    note: depthOk
      ? "why-exists/tension/claim meet minimum substance"
      : "one or more kernel fields too thin",
  };

  const validClaims = kernel.supporting_claims.filter((c) =>
    evidenceIds.has(c.evidence_id)
  );
  const honest =
    kernel.self_assessed_status !== "complete" ||
    (validClaims.length >= 2 && depthOk);
  checks.status_honesty = {
    pass: honest,
    note: `status=${kernel.self_assessed_status}, valid cited claims=${validClaims.length}, missing_information=${kernel.missing_information.length}`,
  };

  // Soft grounding signal (reported, not gated): claim text should overlap its evidence.
  const evidenceBySummary = new Map(
    evidence.map((e) => [e.evidence_id, e.summary])
  );
  const ungrounded = validClaims.filter((c) => {
    const summary = evidenceBySummary.get(c.evidence_id) ?? "";
    return !wordOverlap(c.text, summary);
  });
  checks.grounding_overlap_soft = {
    pass: true,
    note:
      ungrounded.length === 0
        ? "every claim shares vocabulary with its cited evidence"
        : `${ungrounded.length}/${validClaims.length} claims have weak lexical overlap (review manually)`,
  };

  const hardChecks = [
    "no_fabricated_citations",
    "no_banned_claims",
    "no_template_echo",
    "fields_not_cloned",
    "status_honesty",
  ];
  // depth_minimums is only required when the model claims "complete" — a thin
  // corpus SHOULD produce a thin-but-honest kernel.
  const verdictPass =
    hardChecks.every((k) => checks[k].pass) &&
    (kernel.self_assessed_status !== "complete" || checks.depth_minimums.pass);

  return {
    ...base,
    latencyMs,
    tokens: result.tokenUsage?.totalTokens,
    kernel,
    checks,
    verdict: verdictPass ? "PASS" : "FAIL",
  };
}

async function main() {
  const requested = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const domains = requested.length > 0 ? requested : FIXTURES;

  console.log(`Spike model: ${SPIKE_MODEL}`);
  const results: FixtureResult[] = [];
  for (const domain of domains) {
    console.log(`\n=== ${domain} ===`);
    const r = await runFixture(domain);
    results.push(r);
    if (r.status !== "ok") {
      console.log(`  ${r.status}: ${r.detail}`);
      continue;
    }
    console.log(
      `  topic="${r.topic}" evidence=${r.evidenceCount} latency=${r.latencyMs}ms tokens=${r.tokens ?? "?"}`
    );
    console.log(`  self-assessed status: ${r.kernel?.self_assessed_status}`);
    for (const [id, c] of Object.entries(r.checks ?? {})) {
      console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${id} — ${c.note}`);
    }
    console.log(`  VERDICT: ${r.verdict}`);
  }

  const outDir = path.join(process.cwd(), "data", "runtime");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "spike-atom-depth-report.json");
  writeFileSync(
    outPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), model: SPIKE_MODEL, results }, null, 2)
  );
  console.log(`\nReport written: ${outPath}`);

  const ran = results.filter((r) => r.status === "ok");
  const failed = ran.filter((r) => r.verdict === "FAIL");
  const broken = results.filter((r) => r.status !== "ok");
  console.log(
    `\nSummary: ${ran.length - failed.length}/${ran.length} fixtures PASS` +
      (broken.length ? `, ${broken.length} did not run (${broken.map((b) => `${b.domain}:${b.status}`).join(", ")})` : "")
  );
  if (failed.length > 0 || (ran.length === 0 && broken.length > 0)) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : err);
  process.exit(1);
});
