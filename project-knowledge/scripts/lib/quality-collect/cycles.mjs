import fs from "node:fs";
import path from "node:path";
import { relPosix } from "../scan/fs.mjs";
import { collectImportSpecs } from "./imports.mjs";

export function detectCycles(root, srcFiles) {
  /** @type {Map<string, string[]>} */
  const graph = new Map();
  for (const abs of srcFiles) {
    const rel = relPosix(root, abs);
    if (/\.(test|spec)\./.test(rel)) continue;
    const text = fs.readFileSync(abs, "utf8");
    const deps = [];
    for (const spec of collectImportSpecs(text)) {
      if (!spec.startsWith("@/")) continue;
      let target = spec.slice(2);
      const candidates = [
        `src/${target}.ts`,
        `src/${target}.tsx`,
        `src/${target}/index.ts`,
        `src/${target}/index.tsx`,
      ];
      for (const c of candidates) {
        if (fs.existsSync(path.join(root, c))) {
          deps.push(c);
          break;
        }
      }
    }
    graph.set(rel, deps);
  }

  const cycles = [];
  const visiting = new Set();
  const done = new Set();
  const stack = [];

  function dfs(node) {
    if (done.has(node) || cycles.length >= 5) return;
    if (visiting.has(node)) {
      const i = stack.indexOf(node);
      if (i >= 0) cycles.push(stack.slice(i).concat(node).join(" → "));
      return;
    }
    visiting.add(node);
    stack.push(node);
    for (const d of graph.get(node) || []) dfs(d);
    stack.pop();
    visiting.delete(node);
    done.add(node);
  }

  for (const n of graph.keys()) dfs(n);
  return cycles;
}
