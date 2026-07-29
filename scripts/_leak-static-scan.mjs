/**
 * Static leak scan for the two-branch company-profile cutover.
 * Exit 0 = clean; exit 1 = findings.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const findings = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (
      name === "node_modules" ||
      name === ".next" ||
      name === ".git" ||
      name === "data" ||
      name === "reference-library"
    ) {
      continue;
    }
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(name)) out.push(p);
  }
  return out;
}

function rel(p) {
  return path.relative(root, p).replace(/\\/g, "/");
}

// 1) Deleted modules must stay gone
for (const gone of [
  "src/lib/dev/load-zynava-fixture.ts",
  "src/lib/dev/zynava-fixture-paths.ts",
  "src/engine/discovery/persist/legacy.ts",
  "src/components/discovery/discovery-intent.tsx",
]) {
  if (existsSync(path.join(root, gone))) {
    findings.push(`DELETED_FILE_PRESENT ${gone}`);
  }
}

// 2) Banned runtime patterns
const banned = [
  {
    id: "isZynavaHost",
    re: /\bisZynavaHost\b/,
    roots: ["src/engine/discovery", "src/brain", "src/app"],
  },
  {
    id: "ZYNAVA_EXTRA_URLS",
    re: /\bZYNAVA_EXTRA_URLS\b/,
    roots: ["src"],
  },
  {
    id: "load-zynava-fixture import",
    re: /from\s+["']@\/lib\/dev\/load-zynava-fixture["']/,
    roots: ["src", "scripts"],
  },
  {
    id: "zynava-fixture-paths import",
    re: /from\s+["']@\/lib\/dev\/zynava-fixture-paths["']/,
    roots: ["src", "scripts"],
  },
  {
    id: "silent DEFAULT_FIXTURE fallback",
    re: /fixturePath\s*\?\?\s*DEFAULT_FIXTURE\b/,
    roots: ["src/brain"],
  },
  {
    id: "engine import from discovery UI",
    re: /from\s+["']@\/engine\//,
    roots: ["src/components/discovery"],
  },
];

for (const rule of banned) {
  for (const base of rule.roots) {
    const abs = path.join(root, base);
    if (!existsSync(abs)) continue;
    for (const file of walk(abs)) {
      if (file.includes(".test.")) continue;
      const src = readFileSync(file, "utf8");
      if (rule.re.test(src)) {
        findings.push(`${rule.id} @ ${rel(file)}`);
      }
    }
  }
}

// 3) Branch consumers must go through company-profile reader (spot-check)
const getBrandCore = readFileSync(
  path.join(root, "src/brain/core/get-brand-core.ts"),
  "utf8"
);
if (!/readCompanyProfileAsBrainContext/.test(getBrandCore)) {
  findings.push("getBrandCore missing readCompanyProfileAsBrainContext path");
}
if (/fixture:\s*DEFAULT_FIXTURE/.test(getBrandCore)) {
  findings.push("getBrandCore still has silent DEFAULT_FIXTURE");
}

const analyzeRoute = readFileSync(
  path.join(root, "src/app/api/discovery/analyze/route.ts"),
  "utf8"
);
if (!/readCompanyProfileAsync/.test(analyzeRoute)) {
  findings.push("analyze route missing readCompanyProfileAsync");
}

console.log("=== STATIC LEAK SCAN ===");
if (findings.length === 0) {
  console.log("CLEAN — no banned leaks found");
  process.exit(0);
}
console.log(`FINDINGS (${findings.length}):`);
for (const f of findings) console.log(`  - ${f}`);
process.exit(1);
