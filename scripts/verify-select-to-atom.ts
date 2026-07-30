/**
 * ACCEPTANCE GATE — frictionless select-to-atom (runs AFTER the build).
 *
 * Codifies the exit criteria of the Canonical Content Atom plan (Phase 0
 * checklist removal + judge always-on, Phase 1 select→atom flow) as static
 * code checks, so "done" is measured by this script instead of self-grading.
 *
 * EXPECTED TO FAIL before the build. Run with --expect-pre-build to see the
 * current state without a nonzero exit code.
 *
 * Usage:
 *   npx tsx scripts/verify-select-to-atom.ts
 *   npx tsx scripts/verify-select-to-atom.ts --expect-pre-build
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string | null {
  const p = path.join(ROOT, rel);
  if (!existsSync(p)) return null;
  return readFileSync(p, "utf8");
}

type Check = {
  id: string;
  phase: "P0" | "P1" | "P2";
  desc: string;
  run: () => { pass: boolean; note: string };
};

const IDEA_LAB = "src/app/dev/brain/idea-lab";

const CHECKS: Check[] = [
  {
    id: "eval-drawer-deleted",
    phase: "P0",
    desc: "Human evaluation checklist drawer is gone",
    run: () => {
      const gone = !existsSync(path.join(ROOT, IDEA_LAB, "idea-lab-evaluation-drawer.tsx"));
      return { pass: gone, note: gone ? "file absent" : "idea-lab-evaluation-drawer.tsx still exists" };
    },
  },
  {
    id: "idea-quality-schema-deleted",
    phase: "P0",
    desc: "Human idea-quality schema is gone",
    run: () => {
      const gone = !existsSync(path.join(ROOT, "src/brain/evaluation/idea-quality.schema.ts"));
      return { pass: gone, note: gone ? "file absent" : "idea-quality.schema.ts still exists" };
    },
  },
  {
    id: "sandbox-eval-state-removed",
    phase: "P0",
    desc: "Idea Lab sandbox hook carries no human-eval state",
    run: () => {
      const src = read(`${IDEA_LAB}/use-idea-lab-sandbox.ts`);
      if (src === null) return { pass: false, note: "use-idea-lab-sandbox.ts missing" };
      const leftovers = ["evalOpen", "saveEvaluation", "IdeaHumanEvaluation", "resetEvaluation"].filter((s) => src.includes(s));
      return { pass: leftovers.length === 0, note: leftovers.length === 0 ? "no eval symbols" : `still present: ${leftovers.join(", ")}` };
    },
  },
  {
    id: "runs-route-eval-patch-removed",
    phase: "P0",
    desc: "Lab runs API no longer persists human evaluations",
    run: () => {
      const src = read("src/app/api/dev/brain/idea-lab/runs/route.ts");
      if (src === null) return { pass: false, note: "runs route missing" };
      const pass = !src.includes("updateIdeaLabEvaluation");
      return { pass, note: pass ? "evaluation PATCH branch gone" : "updateIdeaLabEvaluation still wired" };
    },
  },
  {
    id: "judge-always-on-lab",
    phase: "P0",
    desc: "GPT-5.4-nano judge runs unconditionally on Idea Lab runs",
    run: () => {
      const src = read("src/brain/use-cases/run-idea-lab-topic-candidates.ts");
      if (src === null) return { pass: false, note: "use case missing" };
      const callsJudge = src.includes("judgeTopicCandidates");
      const stillSampled = src.includes("shouldSampleJudge()");
      const pass = callsJudge && !stillSampled;
      return {
        pass,
        note: pass
          ? "judge invoked without sampling gate"
          : callsJudge
            ? "judge still gated behind shouldSampleJudge()"
            : "judge not invoked at all",
      };
    },
  },
  {
    id: "atom-model-nano",
    phase: "P0",
    desc: "contentAtomLlm registry default is the nano family",
    run: () => {
      const src = read("src/brain/policy/model-registry.ts");
      if (src === null) return { pass: false, note: "model registry missing" };
      const block = src.slice(src.indexOf("contentAtomLlm"), src.indexOf("hookEnrichment"));
      const pass = /default:\s*"gpt-[\d.]*-?nano[^"]*"/.test(block);
      return { pass, note: pass ? "nano default" : `current block: ${block.replace(/\s+/g, " ").slice(0, 120)}` };
    },
  },
  {
    id: "atom-review-panel-exists",
    phase: "P1",
    desc: "Content Studio has a first-class atom review panel",
    run: () => {
      const exists = existsSync(path.join(ROOT, "src/components/dashboard/content/atom-review-panel.tsx"));
      return { pass: exists, note: exists ? "atom-review-panel.tsx present" : "atom-review-panel.tsx not created yet" };
    },
  },
  {
    id: "studio-atom-first-paint",
    phase: "P1",
    desc: "Studio is atomId-only with vision shell; MT builds atom before navigate",
    run: () => {
      const studio = read("src/components/dashboard/content/content-studio.tsx");
      const atomHook = read(
        "src/components/dashboard/content/hooks/use-atom-content-studio.ts"
      );
      const mtHook = read(
        "src/components/dashboard/marketing-topic/hooks/use-content-directions.ts"
      );
      if (studio === null || atomHook === null || mtHook === null) {
        return { pass: false, note: "studio/MT files missing" };
      }
      const atomOnly =
        /AtomDeepLinkStudio/.test(studio) &&
        !/LegacyHandoffContentStudio/.test(studio) &&
        !existsSync(
          path.join(ROOT, "src/components/dashboard/content/hooks/use-content-studio.ts")
        );
      const loadsByAtomId = atomHook.includes("/api/brain/content-atom?atomId=");
      const mtBuildsAtom = mtHook.includes("/api/brain/content-atom");
      const pass = atomOnly && loadsByAtomId && mtBuildsAtom;
      return {
        pass,
        note: pass
          ? "atomId-only Studio; MT builds atom"
          : `${atomOnly ? "" : "legacy studio remains; "}${loadsByAtomId ? "" : "atom hook missing GET; "}${mtBuildsAtom ? "" : "MT missing atom POST"}`.trim(),
      };
    },
  },
  {
    id: "production-atom-id-only",
    phase: "P1",
    desc: "Production route consumes a locked atomId only (no handoff rebuild)",
    run: () => {
      const src = read("src/app/api/brain/content/production/route.ts");
      if (src === null) return { pass: false, note: "production route missing" };
      const acceptsAtomId = src.includes("atomId");
      const rebuildGone = !src.includes("produceContentFromHandoff");
      const pass = acceptsAtomId && rebuildGone;
      return {
        pass,
        note: pass
          ? "atomId in, handoff rebuild gone"
          : `${acceptsAtomId ? "" : "no atomId; "}${rebuildGone ? "" : "still rebuilds from handoff"}`.trim(),
      };
    },
  },
  {
    id: "production-route-authenticated",
    phase: "P0",
    desc: "Production route requires session + company access",
    run: () => {
      const src = read("src/app/api/brain/content/production/route.ts");
      if (src === null) return { pass: false, note: "production route missing" };
      const pass = src.includes("requireApiSession") && src.includes("requireCompanyAccess");
      return { pass, note: pass ? "auth guards present" : "missing requireApiSession/requireCompanyAccess" };
    },
  },
  {
    id: "idea-lab-atom-stage",
    phase: "P1",
    desc: "Idea Lab builds and shows the atom after selection (sandbox policy inverted)",
    run: () => {
      const client = read(`${IDEA_LAB}/idea-lab-client.tsx`);
      const hook = read(`${IDEA_LAB}/use-idea-lab-sandbox.ts`);
      if (client === null || hook === null) return { pass: false, note: "idea lab files missing" };
      const pass = /atom/i.test(client) && /content-atom|atom/i.test(hook);
      return { pass, note: pass ? "atom stage referenced in Lab client + hook" : "no atom stage in Idea Lab" };
    },
  },
  {
    id: "review-route-exists",
    phase: "P1",
    desc: "Atom review/approval transport exists",
    run: () => {
      const exists = existsSync(path.join(ROOT, "src/app/api/brain/content-atom/review/route.ts"));
      return { pass: exists, note: exists ? "content-atom/review route present" : "review route not created yet" };
    },
  },
  {
    id: "old-llm-atom-deleted",
    phase: "P1",
    desc: "Superseded pipeline/llm-atom.ts removed (one model-assisted path)",
    run: () => {
      const gone = !existsSync(path.join(ROOT, "src/brain/pipeline/llm-atom.ts"));
      return { pass: gone, note: gone ? "file absent" : "llm-atom.ts still exists" };
    },
  },
  // Guardrails: systems that must SURVIVE the removal untouched.
  {
    id: "guard-product-history-eval-intact",
    phase: "P0",
    desc: "GUARD: product history saveEvaluation port untouched",
    run: () => {
      const src = read("src/brain/store/topic-generation-repository.ts");
      const pass = src !== null && src.includes("saveEvaluation");
      return { pass, note: pass ? "repository port intact" : "product saveEvaluation was damaged — different system, must stay" };
    },
  },
  {
    id: "guard-judge-intact",
    phase: "P0",
    desc: "GUARD: LLM judge module untouched",
    run: () => {
      const src = read("src/brain/evaluation/judge/llm-judge.ts");
      const pass = src !== null && src.includes("judgeTopicCandidates");
      return { pass, note: pass ? "judge intact" : "llm-judge.ts damaged or missing" };
    },
  },
  {
    id: "guard-quality-alerts-intact",
    phase: "P0",
    desc: "GUARD: quality alert system untouched",
    run: () => {
      const src = read("src/brain/observability/quality-alert.ts");
      const pass = src !== null && src.includes("judge_low_score");
      return { pass, note: pass ? "alerts intact" : "quality-alert.ts damaged or missing" };
    },
  },
  // P2 — rich Content Atom contracts (targets are reported, never validity gates)
  {
    id: "evidence-admission-module",
    phase: "P2",
    desc: "Evidence admission policy module exists with quality floor",
    run: () => {
      const src = read("src/brain/atom/evidence-admission.ts");
      if (src === null) return { pass: false, note: "evidence-admission.ts missing" };
      const pass =
        src.includes("EVIDENCE_ADMISSION_POLICY_VERSION") &&
        src.includes("passesQualityFloor") &&
        src.includes("admitEvidence");
      return { pass, note: pass ? "admission-v1 present" : "admission API incomplete" };
    },
  },
  {
    id: "atom-build-trace-refs-only",
    phase: "P2",
    desc: "Atom build trace is refs/metadata only (no atom body store)",
    run: () => {
      const trace = read("src/brain/atom/build-trace.ts");
      const builder = read("src/brain/atom/build-content-atom.ts");
      if (trace === null || builder === null) {
        return { pass: false, note: "build-trace or build-content-atom missing" };
      }
      const refsOnly =
        trace.includes("Never stores a copy of the atom body") &&
        !existsSync(path.join(ROOT, "src/brain/store/atom-build-trace-repository.ts"));
      const wired = builder.includes("AtomBuildTrace") && builder.includes("makeTrace");
      const pass = refsOnly && wired;
      return {
        pass,
        note: pass
          ? "trace wired on build result; no parallel atom-trace repository"
          : "trace missing or duplicate store present",
      };
    },
  },
  {
    id: "limited-approval-ack",
    phase: "P2",
    desc: "Limited atoms require limitationsAcknowledgement to approve",
    run: () => {
      const src = read("src/brain/atom/approval.ts");
      if (src === null) return { pass: false, note: "approval.ts missing" };
      const pass =
        src.includes("limitationsAcknowledgement") &&
        src.includes("limited atom requires");
      return { pass, note: pass ? "ack gate present" : "limited ack missing" };
    },
  },
  {
    id: "inspector-word-count-reported",
    phase: "P2",
    desc: "Inspector reports word count (not a validity gate)",
    run: () => {
      const src = read("scripts/inspect-content-atom.ts");
      if (src === null) return { pass: false, note: "inspect-content-atom.ts missing" };
      const reports = /wordCount|word count/i.test(src);
      const notGated = !/if\s*\(.*wordCount.*\)\s*throw|wordCount\s*<\s*\d+/.test(src);
      const flags = src.includes("--json") && src.includes("--md-only");
      const pass = reports && notGated && flags;
      return {
        pass,
        note: pass
          ? "word count reported; --json/--md-only present"
          : "inspector missing report/flags or gates on word count",
      };
    },
  },
  {
    id: "revise-action-wired",
    phase: "P2",
    desc: "Review route + Studio support revise (vs choose another direction)",
    run: () => {
      const route = read("src/app/api/brain/content-atom/review/route.ts");
      const panel = read("src/components/dashboard/content/atom-review-panel.tsx");
      if (route === null || panel === null) return { pass: false, note: "review files missing" };
      const pass =
        route.includes('"revise"') &&
        /atom-revise|reviseAtom|onRevise/i.test(panel);
      return { pass, note: pass ? "revise wired" : "revise missing from route/panel" };
    },
  },
  {
    id: "cost-cap-reasons-split",
    phase: "P2",
    desc: "Cost caps distinguish cap_exceeded vs cap_store_unavailable",
    run: () => {
      const src = read("src/brain/llm/cost-caps.ts");
      if (src === null) return { pass: false, note: "cost-caps.ts missing" };
      const pass =
        src.includes("cap_exceeded") &&
        src.includes("cap_store_unavailable") &&
        src.includes("probeLlmUsageDailyTable");
      return { pass, note: pass ? "cap reasons + probe present" : "cost cap split incomplete" };
    },
  },
];

function main() {
  const preBuild = process.argv.includes("--expect-pre-build");
  let failures = 0;

  for (const phase of ["P0", "P1", "P2"] as const) {
    const label =
      phase === "P0"
        ? "Phase 0 — checklist removal, judge, auth"
        : phase === "P1"
          ? "Phase 1 — select→atom flow"
          : "Phase 2 — rich atom contracts";
    console.log(`\n${label}`);
    for (const check of CHECKS.filter((c) => c.phase === phase)) {
      const { pass, note } = check.run();
      if (!pass) failures += 1;
      console.log(`  [${pass ? "PASS" : "FAIL"}] ${check.id} — ${check.desc}`);
      console.log(`         ${note}`);
    }
  }

  const total = CHECKS.length;
  console.log(`\n${total - failures}/${total} checks pass.`);
  if (failures > 0) {
    if (preBuild) {
      console.log("Pre-build mode: failures are expected — this script defines 'done'.");
      return;
    }
    process.exitCode = 1;
  }
}

main();
