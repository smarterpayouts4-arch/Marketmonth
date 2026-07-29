/**
 * Group A — repository structure tests for Cursor context hygiene.
 * Does NOT prove Cursor semantic index retrieval (Group B is manual after Sync).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ignore = require("ignore");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function fail(msg) {
  failures.push(msg);
  console.error(`FAIL: ${msg}`);
}

function ok(msg) {
  console.log(`OK:   ${msg}`);
}

function rel(p) {
  return p.replace(/\\/g, "/");
}

function loadCursorIgnore() {
  const file = path.join(ROOT, ".cursorignore");
  if (!fs.existsSync(file)) {
    fail(".cursorignore missing");
    return null;
  }
  const text = fs.readFileSync(file, "utf8");
  const ig = ignore();
  ig.add(text);
  return ig;
}

function gitCheckIgnore(relPath) {
  const r = spawnSync("git", ["check-ignore", "-q", relPath], {
    cwd: ROOT,
    encoding: "utf8",
  });
  // exit 0 = ignored, 1 = not ignored
  return r.status === 0;
}

function walkJsTs(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walkJsTs(abs, out);
    } else if (/\.(ts|tsx|js|mjs|cjs)$/.test(ent.name)) {
      out.push(abs);
    }
  }
  return out;
}

const MUST_VISIBLE = [
  "project-knowledge/CONTENT_BRAIN.md",
  "project-knowledge/CURRENT_STATE.md",
  "project-knowledge/ARCHITECTURE.md",
  "project-knowledge/PRODUCT.md",
  "project-knowledge/DOMAIN_GLOSSARY.md",
  "project-knowledge/generated/indexes/docs-index.json",
  "project-knowledge/generated/maps/FILE_OWNERSHIP.md",
  "project-knowledge/generated/reports/STRUCTURE_WARNINGS.md",
  "src/brain/policy/provider-policy.ts",
  "mcp/src/security/docs-registry.ts",
  "docs/ai/mcp.md",
  "docs/ai/agent-toolchain.md",
  "docs/ai/cursor-context-and-indexing-policy.md",
  ".env.example",
  ".cursor/mcp.json.example",
  // AGENTS.md mandates Next docs; narrow re-include under node_modules/**/*
  "node_modules/next/dist/docs/index.md",
];

const MUST_EXCLUDED_BY_CURSORIGNORE = [
  ".env.local",
  "data/runtime/idea-lab-runs.json",
  "reference-library/README.md",
  ".next/server/app-paths-manifest.json",
  "project-knowledge/generated/reports/QUALITY_SCORE.md",
  "project-knowledge/generated/reports/quality-score.json",
  ".cursor/hooks/.aps-session.json",
  "src/app/dev/brain/idea-lab/Flow Refernce/Hooked-by-Nir-Eyal-2.pdf",
  ".cursor/rules/example.bak-123",
  // Next package noise must stay ignored; only dist/docs is re-included
  "node_modules/next/package.json",
  "node_modules/lodash/package.json",
];

const REQUIRED_CURSORIGNORE_SNIPPETS = [
  ".env",
  "data/runtime/",
  "reference-library/",
  "node_modules/**/*",
  "!node_modules/next/dist/docs/",
  "/.next/",
  "/dist/",
  "project-knowledge/generated/reports/",
  "STRUCTURE_WARNINGS.md",
];

console.log("validate-cursor-context (Group A — structure)\n");

const ig = loadCursorIgnore();
if (ig) {
  ok(".cursorignore present");
  const raw = fs.readFileSync(path.join(ROOT, ".cursorignore"), "utf8");
  for (const snip of REQUIRED_CURSORIGNORE_SNIPPETS) {
    if (!raw.includes(snip)) fail(`.cursorignore missing required snippet: ${snip}`);
    else ok(`pattern present: ${snip}`);
  }
  if (/\n\.cursor\/mcp\.json\s*$/m.test(raw) || raw.includes("\n.cursor/mcp.json\n")) {
    fail(
      ".cursorignore lists .cursor/mcp.json — classify secrets first; default policy keeps it out of cursorignore"
    );
  } else {
    ok(".cursor/mcp.json not force-excluded by .cursorignore");
  }
}

for (const p of MUST_VISIBLE) {
  const abs = path.join(ROOT, p);
  if (!fs.existsSync(abs)) {
    fail(`required path missing: ${p}`);
    continue;
  }
  if (ig && ig.ignores(rel(p))) {
    fail(`canonical path is matched by .cursorignore: ${p}`);
  } else {
    ok(`visible (not cursorignored): ${p}`);
  }
}

for (const p of MUST_EXCLUDED_BY_CURSORIGNORE) {
  if (!ig) break;
  if (!ig.ignores(rel(p))) {
    fail(`.cursorignore should exclude: ${p}`);
  } else {
    ok(`cursorignored: ${p}`);
  }
}

// gitignore agreement (secrets / runtime)
for (const p of [".env.local", "data/runtime/idea-lab-runs.json", "reference-library/README.md"]) {
  if (gitCheckIgnore(p)) ok(`gitignored: ${p}`);
  else fail(`expected gitignored: ${p}`);
}

if (!gitCheckIgnore(".env.example") && fs.existsSync(path.join(ROOT, ".env.example"))) {
  ok(".env.example not gitignored");
} else if (gitCheckIgnore(".env.example")) {
  fail(".env.example should not be gitignored");
}

// reference-library README promotion keywords
const refReadme = path.join(ROOT, "reference-library", "README.md");
if (fs.existsSync(refReadme)) {
  const body = fs.readFileSync(refReadme, "utf8");
  for (const kw of [
    "Noncanonical",
    "human approval",
    "ADR or canonical",
    "implementation",
    "tests",
    "Prohibited",
  ]) {
    if (!body.includes(kw)) fail(`reference-library/README.md missing keyword: ${kw}`);
  }
  if (!failures.some((f) => f.includes("reference-library/README"))) {
    ok("reference-library/README.md has required promotion/authority language");
  }
} else {
  fail("reference-library/README.md missing");
}

// prohibited imports
const importRe =
  /from\s+["'][^"']*reference-library[^"']*["']|require\s*\(\s*["'][^"']*reference-library/;
for (const rootDir of ["src", "mcp"]) {
  for (const file of walkJsTs(path.join(ROOT, rootDir))) {
    const text = fs.readFileSync(file, "utf8");
    if (importRe.test(text)) {
      fail(`prohibited reference-library import: ${rel(path.relative(ROOT, file))}`);
    }
  }
}
ok("no reference-library module imports under src/ or mcp/");

// MCP example safety
const mcpExample = path.join(ROOT, ".cursor", "mcp.json.example");
if (fs.existsSync(mcpExample)) {
  const j = JSON.parse(fs.readFileSync(mcpExample, "utf8"));
  const blob = JSON.stringify(j);
  if (/sk-|api[_-]?key|secret|token|password/i.test(blob) && !/mcpServers/i.test(blob)) {
    fail(".cursor/mcp.json.example appears to contain secret-like values");
  } else if (/(sk-[a-zA-Z0-9]{10,}|OPENAI_API_KEY\s*[:=]\s*["'][^"']+["'])/.test(blob)) {
    fail(".cursor/mcp.json.example contains secret-like literals");
  } else {
    ok(".cursor/mcp.json.example looks portable (no secret literals detected)");
  }
}

console.log(`
---
MANUAL Group B (after Cursor Settings → Indexing → Sync):
1. Fresh chat, no @file — ask Brand Core compile location
2. Ask canonical Content Brain workflow document
3. Ask provider policy location
4. Ask whether reference-library is part of runtime generation
5. Ask where MCP project documents are allowlisted
Record sources in docs/ai/cursor-context-and-indexing-audit.md
Do NOT treat this script as proof of semantic index quality.
---
`);

if (failures.length) {
  console.error(`\nvalidate-cursor-context: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nvalidate-cursor-context: PASS (Group A)");
process.exit(0);
