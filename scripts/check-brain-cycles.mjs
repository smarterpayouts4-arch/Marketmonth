/**
 * Fail on simple import cycles under src/brain (stabilization gate).
 * Lightweight DFS — not a full madge replacement.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const brainRoot = path.join(process.cwd(), "src", "brain");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.ts$/.test(name) && !name.includes(".test.")) out.push(full);
  }
  return out;
}

function toKey(file) {
  return path.relative(process.cwd(), file).replace(/\\/g, "/").replace(/\.ts$/, "");
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith("@/brain/") && !spec.startsWith(".")) return null;
  let abs;
  if (spec.startsWith("@/brain/")) {
    abs = path.join(process.cwd(), "src", "brain", spec.slice("@/brain/".length));
  } else {
    abs = path.resolve(path.dirname(fromFile), spec);
  }
  const candidates = [`${abs}.ts`, path.join(abs, "index.ts")];
  for (const c of candidates) {
    try {
      statSync(c);
      return toKey(c);
    } catch {
      /* continue */
    }
  }
  return null;
}

const files = walk(brainRoot);
const graph = new Map();

for (const file of files) {
  const key = toKey(file);
  const src = readFileSync(file, "utf8");
  const deps = new Set();
  const re = /from\s+["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src))) {
    const dep = resolveImport(file, m[1]);
    if (dep && dep.startsWith("src/brain/")) deps.add(dep);
  }
  graph.set(key, [...deps]);
}

const visiting = new Set();
const visited = new Set();
const stack = [];

function dfs(node) {
  if (visited.has(node)) return;
  if (visiting.has(node)) {
    const i = stack.indexOf(node);
    const cycle = [...stack.slice(i), node].join(" -> ");
    console.error(`FAIL brain import cycle: ${cycle}`);
    process.exit(1);
  }
  visiting.add(node);
  stack.push(node);
  for (const dep of graph.get(node) || []) {
    if (graph.has(dep)) dfs(dep);
  }
  stack.pop();
  visiting.delete(node);
  visited.add(node);
}

for (const node of graph.keys()) dfs(node);
console.log(`PASS brain cycle check (${graph.size} modules)`);
