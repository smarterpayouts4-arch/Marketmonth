import fs from "node:fs";
import path from "node:path";
import { walkFiles } from "./fs.mjs";

export function parseEnvExample(text) {
  const keys = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const m = t.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (m) keys.push(m[1]);
  }
  return [...new Set(keys)].sort();
}

export function collectProcessEnvRefs(root) {
  const srcRoot = path.join(root, "src");
  const files = walkFiles(srcRoot, (f) => /\.(ts|tsx|js|mjs|cjs)$/.test(f));
  const keys = new Set();
  const re = /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g;
  for (const f of files) {
    const text = fs.readFileSync(f, "utf8");
    let m;
    while ((m = re.exec(text))) keys.add(m[1]);
  }
  return [...keys].sort();
}
