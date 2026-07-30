/**
 * LIVE WALKTHROUGH — Company collection → topics → ideas → Content Atom
 *
 * One descriptive end-to-end run of the product Content Brain path.
 * Everything after the company load is generated dynamically (no canned
 * topic/direction/atom fixtures).
 *
 * Pipeline:
 *   1. Load company profile (approved CSV on disk; DB artifact when available)
 *   2. Compile Brand Core (runtime brand SoT)
 *   3. Generate topic candidates for a category
 *   4. Select one topic (by rank)
 *   5. Generate six editorial directions (ideas)
 *   6. Select one direction
 *   7. Build Content Atom (constrained LLM when keyed; honest thin fallback)
 *   8. Print validation / gates / claim ledger / issues
 *
 * Usage:
 *   npm run walkthrough:company-to-atom
 *   npm run walkthrough:company-to-atom -- zynava.com
 *   npm run walkthrough:company-to-atom -- clearflowplumbing.example --category trust_proof
 *   npm run walkthrough:company-to-atom -- zynava.com --topic-rank 2 --direction-rank 3
 *   npm run walkthrough:company-to-atom -- zynava.com --no-llm
 *   npm run walkthrough:company-to-atom -- zynava.com --json
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildContentAtom } from "../src/brain/atom/build-content-atom";
import { renderReadableDocument } from "../src/brain/atom/readable-document";
import type { ContentAtom } from "../src/brain/atom/content-atom.schema";
import type { AtomValidationReport } from "../src/brain/atom/validate/types";
import type { TopicCategoryId } from "../src/brain/content/topic-category";
import { TOPIC_CATEGORY_IDS } from "../src/brain/content/topic-category";
import {
  fixturePathForCompany,
  getBrandCore,
  getBrandCoreAsync,
  type GetBrandCoreResult,
} from "../src/brain/core/get-brand-core";
import {
  beginPipelineTrace,
  endPipelineTrace,
  getRejectionRollup,
  pipelineTrace,
} from "../src/brain/debug/pipeline-trace";
import { openPipelineTraceJsonl } from "../src/brain/debug/pipeline-trace-persist";
import { generateTopicCandidates } from "../src/brain/evaluation/generate-topic-candidates";
import { resolveModel } from "../src/brain/policy/model-registry";
import { generateAndRecordContentDirections } from "../src/brain/use-cases/generate-content-directions";
import { selectedTopicContextFromCandidate } from "../src/components/topic-candidates/from-candidate";

// Force full pipeline TRACE for walkthrough runs (terminal + JSONL).
process.env.MM_PIPELINE_TRACE = process.env.MM_PIPELINE_TRACE || "1";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

type Cli = {
  domain: string;
  category: TopicCategoryId;
  topicRank: number;
  directionRank: number;
  preferLlm: boolean;
  jsonOnly: boolean;
};

function parseCli(argv: string[]): Cli {
  const args = argv.slice(2);
  let domain = "zynava.com";
  let category: TopicCategoryId = "product_education";
  let topicRank = 1;
  let directionRank = 1;
  let preferLlm = true;
  let jsonOnly = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--category" || a === "--topic-category") {
      const next = args[++i];
      if (next && TOPIC_CATEGORY_IDS.includes(next as TopicCategoryId)) {
        category = next as TopicCategoryId;
      }
      continue;
    }
    if (a === "--topic-rank") {
      topicRank = Math.max(1, Number(args[++i]) || 1);
      continue;
    }
    if (a === "--direction-rank") {
      directionRank = Math.max(1, Number(args[++i]) || 1);
      continue;
    }
    if (a === "--no-llm") {
      preferLlm = false;
      continue;
    }
    if (a === "--json") {
      jsonOnly = true;
      continue;
    }
    if (a.startsWith("-")) continue;
    if (TOPIC_CATEGORY_IDS.includes(a as TopicCategoryId)) {
      category = a as TopicCategoryId;
      continue;
    }
    domain = a;
  }

  return { domain, category, topicRank, directionRank, preferLlm, jsonOnly };
}

// ---------------------------------------------------------------------------
// Pretty printing
// ---------------------------------------------------------------------------

type Issue = {
  severity: "error" | "warn" | "info";
  step: string;
  message: string;
};

const issues: Issue[] = [];

function note(
  severity: Issue["severity"],
  step: string,
  message: string
): void {
  issues.push({ severity, step, message });
}

function hr(char = "─", width = 72): string {
  return char.repeat(width);
}

function banner(step: string, title: string): void {
  console.log("");
  console.log(hr("═"));
  console.log(`  ${step}  ${title}`);
  console.log(hr("═"));
}

function sub(label: string, value: unknown): void {
  const text =
    typeof value === "string"
      ? value
      : value === undefined || value === null
        ? "—"
        : String(value);
  console.log(`  ${label.padEnd(22)} ${text}`);
}

function bullet(text: string, indent = 2): void {
  console.log(`${" ".repeat(indent)}• ${text}`);
}

function truncate(s: string, max = 140): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function collectAtomText(atom: ContentAtom): string {
  const k = atom.kernel;
  const mod = atom.narrativeModules[atom.lineage.angle];
  const spine = mod?.canonicalNarrativeSpine;
  return [
    k.audience_state,
    k.audience_problem,
    k.why_problem_exists,
    k.core_tension,
    k.central_claim.canonical_wording,
    k.belief_shift.from,
    k.belief_shift.to,
    k.resolution,
    k.payoff,
    spine?.setup,
    spine?.explanation,
    spine?.keyInsight,
    ...atom.claimLedger.claims.map((c) => c.statement),
  ]
    .filter(Boolean)
    .join(" ");
}

function csvProfileSummary(csvPath: string): {
  rows: number;
  recordTypes: Record<string, number>;
  sampleFields: string[];
} {
  const raw = readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const body = lines.slice(1);
  const recordTypes: Record<string, number> = {};
  const sampleFields: string[] = [];
  for (const line of body) {
    // approved.csv: record_type,field,value,...
    const m = line.match(/^"?([^"]+)"?\s*,\s*"?([^"]+)"?\s*,/);
    if (!m) continue;
    const recordType = m[1]!.trim();
    const field = m[2]!.trim();
    recordTypes[recordType] = (recordTypes[recordType] ?? 0) + 1;
    if (sampleFields.length < 12) {
      sampleFields.push(`${recordType}.${field}`);
    }
  }
  return { rows: body.length, recordTypes, sampleFields };
}

// ---------------------------------------------------------------------------
// Company load (CSV first, DB when available)
// ---------------------------------------------------------------------------

async function loadCompany(domain: string): Promise<{
  loaded: GetBrandCoreResult;
  csvPath: string | null;
  csvStats: ReturnType<typeof csvProfileSummary> | null;
  dbAttempted: boolean;
  dbSource: string | null;
}> {
  const csvRelative = fixturePathForCompany(domain);
  const csvAbsolute = csvRelative
    ? path.join(process.cwd(), csvRelative)
    : null;
  const csvStats =
    csvAbsolute && existsSync(csvAbsolute)
      ? csvProfileSummary(csvAbsolute)
      : null;

  let dbAttempted = false;
  let dbSource: string | null = null;
  let loaded: GetBrandCoreResult | null = null;

  if (process.env.DATABASE_URL?.trim()) {
    dbAttempted = true;
    try {
      loaded = await getBrandCoreAsync(domain);
      dbSource = loaded.source;
    } catch (err) {
      note(
        "warn",
        "company_load",
        `DB/artifact load failed, falling back to disk CSV: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  if (!loaded) {
    loaded = getBrandCore(domain);
  }

  return {
    loaded,
    csvPath: csvRelative,
    csvStats,
    dbAttempted,
    dbSource,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const cli = parseCli(process.argv);
  const started = Date.now();
  const atomModel = resolveModel("contentAtomLlm");
  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());

  if (!cli.jsonOnly) {
    console.log("");
    console.log("MARKETMONTH LIVE WALKTHROUGH");
    console.log("Company collection → Brand Core → Topics → Ideas → Atom");
    console.log(hr());
    sub("company", cli.domain);
    sub("topic category", cli.category);
    sub("topic rank", `#${cli.topicRank}`);
    sub("direction rank", `#${cli.directionRank}`);
    sub("atom model", atomModel);
    sub("prefer LLM", String(cli.preferLlm));
    sub("OPENAI_API_KEY", hasOpenAi ? "set" : "missing (deterministic atom path)");
    sub("DATABASE_URL", process.env.DATABASE_URL?.trim() ? "set" : "unset");
  }

  // ── 1. Company collection ───────────────────────────────────────────────
  banner("STEP 1/7", "Load company collection (approved profile)");
  const company = await loadCompany(cli.domain);
  const { brandCore, identity, context, source } = company.loaded;
  openPipelineTraceJsonl(company.loaded.companyId);
  beginPipelineTrace(company.loaded.companyId);
  pipelineTrace(
    "company.load",
    {
      company: company.loaded.companyId,
      source,
      proofs: brandCore.proof_library.length,
      csvRows: company.csvStats?.rows ?? null,
    },
    "ok"
  );

  if (!cli.jsonOnly) {
    sub("resolved companyId", company.loaded.companyId);
    sub("load source", source);
    sub("CSV path", company.csvPath ?? "(none on disk)");
    if (company.csvStats) {
      sub("CSV data rows", company.csvStats.rows);
      console.log("  record types:");
      for (const [rt, n] of Object.entries(company.csvStats.recordTypes).sort()) {
        bullet(`${rt}: ${n} rows`, 4);
      }
      console.log("  sample fields:");
      for (const f of company.csvStats.sampleFields) bullet(f, 4);
    }
    if (company.dbAttempted) {
      sub("DB artifact try", company.dbSource ?? "failed → CSV fallback");
    } else {
      sub("DB artifact try", "skipped (no DATABASE_URL)");
    }
    console.log("");
    console.log("  What this step means:");
    console.log(
      "  The approved company profile (CSV and/or Neon artifact) is the"
    );
    console.log(
      "  collected truth about the brand — offers, proofs, FAQs, bans, etc."
    );
  }

  if (!company.csvPath && source === "fixture") {
    note("error", "company_load", "No approved.csv found for company");
  }
  if (brandCore.proof_library.length === 0) {
    note(
      "warn",
      "company_load",
      "Proof library is empty — atom will likely be insufficient/limited"
    );
  }

  // ── 2. Brand Core ───────────────────────────────────────────────────────
  banner("STEP 2/7", "Compile Brand Core (runtime brand SoT)");
  if (!cli.jsonOnly) {
    sub("brand name", brandCore.brand_name);
    sub("domain", brandCore.domain);
    sub("brand_core_id", identity.brand_core_id);
    sub("brand_core_hash", identity.brand_core_hash.slice(0, 16) + "…");
    sub("positioning", truncate(brandCore.positioning || "(empty)", 100));
    sub("audience", brandCore.audience.primary || "(empty)");
    sub("offers", brandCore.offers.length);
    sub("indexed products", brandCore.indexed_products?.length ?? 0);
    sub("proof library", brandCore.proof_library.length);
    sub("banned claims", brandCore.banned_claims.length);
    sub("market subjects", brandCore.market_subjects.length);
    console.log("  sample proofs:");
    for (const p of brandCore.proof_library.slice(0, 5)) {
      bullet(`[${p.proof_id}] ${truncate(p.summary, 100)}`, 4);
    }
    if (brandCore.proof_library.length > 5) {
      bullet(`… +${brandCore.proof_library.length - 5} more`, 4);
    }
    console.log("");
    console.log("  What this step means:");
    console.log(
      "  CSV/artifact → compileBrandCore() → closed Brand Core used by"
    );
    console.log("  every later stage (topics, directions, atom).");
  }

  // ── 3. Topics ───────────────────────────────────────────────────────────
  banner("STEP 3/7", "Generate topic candidates (dynamic)");
  const topicStarted = Date.now();
  const generation = generateTopicCandidates({
    context,
    objective: cli.category,
  });
  const topicMs = Date.now() - topicStarted;

  if (generation.status === "insufficient_context") {
    note(
      "error",
      "topics",
      generation.diagnostic.message || "insufficient_context"
    );
    throw new Error(
      `Topic generation failed: ${generation.diagnostic.message}`
    );
  }

  const candidates = generation.candidates;
  if (candidates.length === 0) {
    note("error", "topics", "No topic candidates returned");
    throw new Error("No topic candidates returned");
  }

  if (!cli.jsonOnly) {
    sub("generator", "generateTopicCandidates (product deterministic path)");
    sub("category", cli.category);
    sub("candidates", candidates.length);
    sub("latency", `${topicMs}ms`);
    console.log("  All generated topics:");
    for (const c of candidates) {
      bullet(
        `#${c.rank}  ${c.title}  (evidence=${c.evidenceIds.length}, conf=${c.confidence})`,
        4
      );
      if (c.audiencePain) {
        console.log(`       pain: ${truncate(c.audiencePain, 110)}`);
      }
    }
    console.log("");
    console.log("  What this step means:");
    console.log(
      "  Product Marketing Topic uses the deterministic topic generator"
    );
    console.log(
      "  (not Idea Lab’s LLM candidates). Topics are grounded in Brand Core."
    );
  }

  // ── 4. Select topic ─────────────────────────────────────────────────────
  banner("STEP 4/7", "Select one topic (simulated human choice)");
  const topicIdx = Math.min(cli.topicRank, candidates.length) - 1;
  const topic = candidates[topicIdx]!;
  const selectedTopicContext = selectedTopicContextFromCandidate(
    topic,
    cli.category
  );

  if (!cli.jsonOnly) {
    sub("selected rank", `#${topic.rank} (index ${topicIdx})`);
    sub("topicId", topic.topicId);
    sub("title", topic.title);
    sub("audience", truncate(topic.audience || "", 100));
    sub("strategic angle", truncate(topic.strategicAngle || "", 100));
    sub("evidence ids", topic.evidenceIds.join(", ") || "(none)");
    sub("grounding", selectedTopicContext.grounding);
    console.log("");
    console.log("  What this step means:");
    console.log(
      "  In the product UI a human picks ONE topic. Here we pick by --topic-rank."
    );
  }

  // ── 5. Directions / ideas ───────────────────────────────────────────────
  banner("STEP 5/7", "Generate editorial directions / ideas (dynamic)");
  const dirStarted = Date.now();
  const dirs = await generateAndRecordContentDirections({
    domain: cli.domain,
    mode: "automatic",
    topic: selectedTopicContext.masterTitle,
    topicCategory: cli.category,
    requestedVariations: 6,
    directionsProvider: "deterministic-v1",
    selectedTopicContext,
    runPurpose: "benchmark",
    preloaded: { context, identity },
  });
  const dirMs = Date.now() - dirStarted;

  if (!dirs.ok) {
    note("error", "directions", dirs.error);
    throw new Error(`Directions failed: ${dirs.error}`);
  }

  if (dirs.result.status === "blocked") {
    const msg = (dirs.result.warnings ?? []).join("; ") || "blocked";
    note("error", "directions", msg);
    throw new Error(`Directions blocked: ${msg}`);
  }

  const variations =
    dirs.result.status === "ready" || dirs.result.status === "partially_ready"
      ? dirs.result.variations
      : [];

  if (variations.length === 0) {
    note("error", "directions", `No variations (status=${dirs.result.status})`);
    throw new Error(`No directions (status=${dirs.result.status})`);
  }

  if (variations.length < 6) {
    note(
      "warn",
      "directions",
      `Expected 6 ideas, got ${variations.length} (status=${dirs.result.status})`
    );
  }

  if (!cli.jsonOnly) {
    sub("status", dirs.result.status);
    sub("provider", "deterministic-v1");
    sub("generationId", dirs.generationId ?? "(none)");
    sub("history persisted", String(dirs.historyPersisted));
    sub("master punchline", truncate(dirs.result.masterTopic.punchline, 100));
    sub("ideas count", variations.length);
    sub("latency", `${dirMs}ms`);
    console.log("  All generated ideas (directions):");
    for (const [i, v] of variations.entries()) {
      bullet(
        `#${i + 1} [${v.angle}] ${v.punchline}`,
        4
      );
      console.log(`       brief: ${truncate(v.brief || v.subheading || "", 110)}`);
      console.log(
        `       evidence: ${(v.evidenceIds ?? []).slice(0, 6).join(", ") || "(none)"}`
      );
    }
    console.log("");
    console.log("  What this step means:");
    console.log(
      "  One master topic expands into six angle variations. The human"
    );
    console.log("  will pick exactly one idea to become the Content Atom.");
  }

  // ── 6. Select direction ─────────────────────────────────────────────────
  banner("STEP 6/7", "Select one idea / direction (simulated human choice)");
  const dirIdx = Math.min(cli.directionRank, variations.length) - 1;
  const variation = variations[dirIdx]!;

  if (!cli.jsonOnly) {
    sub("selected", `#${dirIdx + 1} / ${variations.length}`);
    sub("variation id", variation.id);
    sub("angle", variation.angle);
    sub("punchline", variation.punchline);
    sub("audience problem", truncate(variation.audienceProblem || "", 110));
    sub("strategic purpose", truncate(variation.strategicPurpose || "", 110));
    sub("evidence ids", (variation.evidenceIds ?? []).join(", ") || "(none)");
    console.log("");
    console.log("  What this step means:");
    console.log(
      "  Selection freezes the editorial direction. Atom build is bound to it."
    );
  }

  // ── 7. Content Atom ─────────────────────────────────────────────────────
  banner("STEP 7/7", "Build Content Atom (dynamic, live)");
  const useLlm = cli.preferLlm && hasOpenAi;
  if (cli.preferLlm && !hasOpenAi) {
    note(
      "warn",
      "atom",
      "preferLlm requested but OPENAI_API_KEY missing — deterministic thin path"
    );
  }

  if (!cli.jsonOnly) {
    sub("preferLlm effective", String(useLlm));
    sub("model", useLlm ? atomModel : "deterministic skeleton");
    console.log("  Building…");
  }

  const atomStarted = Date.now();
  const built = await buildContentAtom({
    brandCore,
    preferLlm: useLlm,
    apiKey: process.env.OPENAI_API_KEY?.trim(),
    selected: {
      masterTopic: dirs.result.masterTopic,
      variation,
      selectedTopicContext,
      generationId: dirs.generationId ?? undefined,
      topicCategory: cli.category,
    },
  });
  const atomMs = Date.now() - atomStarted;
  pipelineTrace(
    "atom.generate",
    {
      provider: built.provider,
      status: built.atom?.buildStatus,
      claims: built.atom?.claimLedger.claims.length,
      model: atomModel,
    },
    built.ok ? "ok" : "fail"
  );

  if (!built.atom) {
    note(
      "error",
      "atom",
      (built.ok ? [] : built.errors).join("; ") || "no atom returned"
    );
    throw new Error(
      `Atom build failed: ${(built.ok ? [] : built.errors).join("; ")}`
    );
  }

  const atom = built.atom;
  const report: AtomValidationReport | undefined = built.report;
  const words = wordCount(collectAtomText(atom));
  const gates = report?.gateResults ?? [];
  const gatePass = gates.filter((g) => g.outcome === "pass").length;
  const gateWarn = gates.filter((g) => g.outcome === "warn").length;
  const gateFail = gates.filter((g) => g.outcome === "fail").length;

  if (atom.buildStatus === "invalid") {
    note("error", "atom", "buildStatus=invalid");
  } else if (atom.buildStatus === "insufficient") {
    note(
      "warn",
      "atom",
      "buildStatus=insufficient — honest thin outcome (not specialist-ready)"
    );
  } else if (atom.buildStatus === "limited") {
    note(
      "info",
      "atom",
      "buildStatus=limited — approvable only with limitations acknowledgement"
    );
  }

  if (!cli.jsonOnly) {
    sub("ok", String(built.ok));
    sub("provider", built.provider);
    sub("buildStatus", atom.buildStatus);
    sub("approvalStatus", atom.approvalStatus);
    sub("atom id", atom.atom_id);
    sub("words", `${words} (target ~500–700; not a validity gate)`);
    sub("claims", atom.claimLedger.claims.length);
    sub("latency", `${atomMs}ms`);
    sub(
      "gates",
      `${gatePass} pass / ${gateWarn} warn / ${gateFail} fail`
    );
    if (built.trace) {
      sub("trace kind", built.trace.kind);
      sub("trace buildKey", built.trace.buildKey ?? "(none)");
      sub(
        "trace admitted",
        `${built.trace.admittedEvidenceIds.length} evidence ids`
      );
    }

    console.log("");
    console.log("  Thesis:");
    console.log(`    ${truncate(atom.kernel.central_claim.canonical_wording, 200)}`);
    console.log("  Belief shift:");
    console.log(
      `    ${truncate(atom.kernel.belief_shift.from, 90)} → ${truncate(atom.kernel.belief_shift.to, 90)}`
    );
    console.log("  Claim ledger:");
    if (atom.claimLedger.claims.length === 0) {
      bullet("(empty — thin/insufficient path)", 4);
    } else {
      for (const c of atom.claimLedger.claims.slice(0, 8)) {
        bullet(
          `[${c.classification}] ${truncate(c.statement, 100)}  (rule=${c.claimRuleId ?? "—"}; ev=${c.evidenceIds.join(",")})`,
          4
        );
      }
      if (atom.claimLedger.claims.length > 8) {
        bullet(`… +${atom.claimLedger.claims.length - 8} more`, 4);
      }
    }

    if (atom.missing_information.length) {
      console.log("  Missing information:");
      for (const m of atom.missing_information.slice(0, 8)) {
        bullet(truncate(m, 120), 4);
      }
    }

    if (gates.length) {
      console.log("  Gate results:");
      for (const g of gates) {
        bullet(`[${g.outcome}] ${g.gateId}: ${g.message}`, 4);
      }
    }

    if (report?.violations?.length) {
      console.log("  Violations:");
      for (const v of report.violations.slice(0, 12)) {
        bullet(`[${v.severity}] ${v.code} @ ${v.path}: ${truncate(v.message, 100)}`, 4);
      }
    }

    console.log("");
    console.log("  What this step means:");
    console.log(
      "  The Content Atom is the channel-neutral strategic SoT. Specialists"
    );
    console.log(
      "  (e.g. YouTube Short) only run after approve/lock — not before."
    );
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  const elapsed = Date.now() - started;
  if (!cli.jsonOnly) {
    banner("SUMMARY", "End-to-end result");
    sub("company", `${brandCore.brand_name} (${cli.domain})`);
    sub("topic", topic.title);
    sub("idea", `[${variation.angle}] ${variation.punchline}`);
    sub("atom status", atom.buildStatus);
    sub("provider", built.provider);
    sub("total latency", `${elapsed}ms`);
    sub(
      "issues logged",
      `${issues.filter((i) => i.severity === "error").length} error / ${
        issues.filter((i) => i.severity === "warn").length
      } warn / ${issues.filter((i) => i.severity === "info").length} info`
    );

    if (issues.length) {
      console.log("");
      console.log("  Issues / observations found during this run:");
      for (const i of issues) {
        bullet(`[${i.severity}] (${i.step}) ${i.message}`, 4);
      }
    } else {
      console.log("");
      console.log("  No issues logged.");
    }

    console.log("");
    console.log("  Pipeline complete.");
    console.log(
      "  Next product step after this script: human approve/lock → channel specialist."
    );
  }

  const outDir = path.join(process.cwd(), "data", "runtime");
  const atomsDir = path.join(outDir, "atoms");
  mkdirSync(outDir, { recursive: true });
  mkdirSync(atomsDir, { recursive: true });
  const readable = renderReadableDocument({
    brand: brandCore.brand_name,
    topic: topic.title,
    atom,
    report: built.report,
    brandCore,
    admitted: built.trace?.admittedEvidence,
    rejected: built.trace?.rejectedEvidence,
  });
  const atomBodyPath = path.join(atomsDir, `${atom.atom_id}.json`);
  const readablePath = path.join(atomsDir, `${atom.atom_id}.md`);
  const rejectionRollup = getRejectionRollup();
  writeFileSync(
    atomBodyPath,
    JSON.stringify(
      {
        atom,
        report: built.report,
        trace: built.trace ?? null,
        rejection_rollup: rejectionRollup,
      },
      null,
      2
    )
  );
  writeFileSync(readablePath, readable);
  pipelineTrace(
    "atom.persist",
    { path: atomBodyPath, full: true, readable: readablePath },
    "ok"
  );
  endPipelineTrace({ elapsedMs: elapsed });

  const reportPath = path.join(outDir, "walkthrough-company-to-atom.json");
  const payload = {
    generatedAt: new Date().toISOString(),
    elapsedMs: elapsed,
    cli,
    company: {
      companyId: company.loaded.companyId,
      source,
      csvPath: company.csvPath,
      csvRows: company.csvStats?.rows ?? null,
      dbAttempted: company.dbAttempted,
      dbSource: company.dbSource,
      brandName: brandCore.brand_name,
      proofCount: brandCore.proof_library.length,
      offerCount: brandCore.offers.length,
    },
    topic: {
      rank: topic.rank,
      topicId: topic.topicId,
      title: topic.title,
      evidenceIds: topic.evidenceIds,
      latencyMs: topicMs,
      allTitles: candidates.map((c) => ({ rank: c.rank, title: c.title })),
    },
    directions: {
      status: dirs.result.status,
      generationId: dirs.generationId ?? null,
      historyPersisted: dirs.historyPersisted,
      latencyMs: dirMs,
      ideas: variations.map((v, i) => ({
        rank: i + 1,
        id: v.id,
        angle: v.angle,
        punchline: v.punchline,
        evidenceIds: v.evidenceIds,
      })),
      selected: {
        rank: dirIdx + 1,
        id: variation.id,
        angle: variation.angle,
        punchline: variation.punchline,
      },
    },
    atom: {
      ok: built.ok,
      provider: built.provider,
      buildStatus: atom.buildStatus,
      approvalStatus: atom.approvalStatus,
      atomId: atom.atom_id,
      wordCount: words,
      claimCount: atom.claimLedger.claims.length,
      latencyMs: atomMs,
      missingInformation: atom.missing_information,
      gateSummary: { pass: gatePass, warn: gateWarn, fail: gateFail },
      gates,
      statusReasons: built.report?.statusReasons ?? [],
      centralClaim: atom.kernel.central_claim.canonical_wording,
      beliefShift: atom.kernel.belief_shift,
      claims: atom.claimLedger.claims,
      /** Full atom body on disk — not summary-only. */
      fullAtomPath: atomBodyPath,
      readablePath,
      body: atom,
      report: built.report,
      trace: built.trace ?? null,
      errors: built.ok ? [] : built.errors,
    },
    rejection_rollup: rejectionRollup,
    issues,
  };
  writeFileSync(reportPath, JSON.stringify(payload, null, 2));

  if (cli.jsonOnly) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("");
    console.log(`  Wrote full machine report: ${reportPath}`);
    console.log(`  Wrote full atom body: ${atomBodyPath}`);
    console.log(`  Wrote readable markdown: ${readablePath}`);
    console.log("");
  }

  const hardErrors = issues.filter((i) => i.severity === "error");
  if (hardErrors.length > 0 || atom.buildStatus === "invalid") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("");
  console.error("WALKTHROUGH FAILED");
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
