/**
 * Ensures generated Knowledge OS reports do not embed secret values.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const reportsDir = path.join(
  root,
  "project-knowledge",
  "generated",
  "reports"
);

/** Patterns that indicate a leaked value (not merely a variable name). */
const VALUE_PATTERNS = [
  /OPENAI_API_KEY\s*=\s*["']?sk-[A-Za-z0-9_-]{10,}/i,
  /AUTH_SECRET\s*=\s*["']?[A-Za-z0-9+/=_-]{16,}/i,
  /DATABASE_URL\s*=\s*["']?postgres(ql)?:\/\/\S+/i,
  /GOOGLE_CLIENT_SECRET\s*=\s*["']?[A-Za-z0-9_-]{8,}/i,
  /PERPLEXITY_API_KEY\s*=\s*["']?pplx-[A-Za-z0-9_-]{8,}/i,
  /Bearer\s+[A-Za-z0-9._-]{20,}/,
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) out.push(...walk(abs));
    else if (/\.(md|json|txt)$/i.test(name)) out.push(abs);
  }
  return out;
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok — ${name}`);
  } catch (e) {
    console.error(`FAIL — ${name}`);
    throw e;
  }
}

test("generated reports directory exists", () => {
  assert.ok(fs.existsSync(reportsDir), "reports dir missing — run quality:update");
});

test("no secret VALUES in generated reports", () => {
  const files = walk(reportsDir);
  assert.ok(files.length > 0, "expected report files");
  const hits = [];
  for (const f of files) {
    const text = fs.readFileSync(f, "utf8");
    for (const re of VALUE_PATTERNS) {
      if (re.test(text)) hits.push(`${path.relative(root, f)} ~ ${re}`);
    }
  }
  assert.equal(hits.length, 0, `secret-like values found:\n${hits.join("\n")}`);
});

test("fixture with fake secret pattern is detectable", () => {
  const sample = 'OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz012345';
  assert.ok(VALUE_PATTERNS[0].test(sample));
});
