import fs from "node:fs";
import path from "node:path";
import { getRepoRoot } from "../../lib/repo.js";

type StageRule = { surface: string; stage: string };

type RouteStageRules = {
  exact?: Record<string, StageRule>;
  prefixes?: { prefix: string; surface: string; stage: string }[];
  fallback?: StageRule;
};

let cached: RouteStageRules | null = null;

function loadRules(): RouteStageRules {
  if (cached) return cached;
  const p = path.join(
    getRepoRoot(),
    "project-knowledge",
    "route-stage-rules.json"
  );
  cached = JSON.parse(fs.readFileSync(p, "utf8")) as RouteStageRules;
  return cached;
}

export function stageFor(route: string): {
  expectedSurface: string;
  expectedStage: string;
} {
  const rules = loadRules();
  const exact = rules.exact?.[route];
  if (exact) {
    return { expectedSurface: exact.surface, expectedStage: exact.stage };
  }
  for (const row of rules.prefixes || []) {
    if (route.startsWith(row.prefix)) {
      return { expectedSurface: row.surface, expectedStage: row.stage };
    }
  }
  const fb = rules.fallback || { surface: "unknown", stage: "UNCERTAIN" };
  return { expectedSurface: fb.surface, expectedStage: fb.stage };
}
