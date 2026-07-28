import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "./roots.mjs";

/** @type {Map<string, object>} */
const cacheByRoot = new Map();

const EMPTY_RULES = {
  exact: {},
  prefixes: [],
  fallback: { surface: "unknown", stage: "UNCERTAIN" },
};

export function loadRouteStageRules(root = repoRoot()) {
  const key = path.resolve(root);
  if (cacheByRoot.has(key)) return cacheByRoot.get(key);
  const p = path.join(root, "project-knowledge", "route-stage-rules.json");
  let rules = EMPTY_RULES;
  if (fs.existsSync(p)) {
    rules = JSON.parse(fs.readFileSync(p, "utf8"));
  }
  cacheByRoot.set(key, rules);
  return rules;
}

export function expectedStageForRoute(route, root = repoRoot()) {
  const rules = loadRouteStageRules(root);
  if (rules.exact?.[route]) return rules.exact[route];
  for (const row of rules.prefixes || []) {
    if (route.startsWith(row.prefix)) {
      return { surface: row.surface, stage: row.stage };
    }
  }
  return rules.fallback || { surface: "unknown", stage: "UNCERTAIN" };
}
