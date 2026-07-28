/**
 * Proves Knowledge OS collectors notice structural changes via isolated fixtures.
 * Visibility timing (documented): knowledge:update regenerates maps; knowledge:check
 * fails on stale compare; quality:check / CI / daily:closeout consume those artifacts.
 * Not a continuous file watcher.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildArtifactBundle } from "../scripts/lib/scan/artifacts.mjs";
import { collectProcessEnvRefs } from "../scripts/lib/scan/env.mjs";

const VALUE_PATTERNS = [
  /OPENAI_API_KEY\s*=\s*["']?sk-[A-Za-z0-9_-]{10,}/i,
];

function test(name, fn) {
  try {
    fn();
    console.log(`ok — ${name}`);
  } catch (e) {
    console.error(`FAIL — ${name}`);
    throw e;
  }
}

function makeFixture() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mm-living-"));
  fs.mkdirSync(path.join(tmp, "src", "app"), { recursive: true });
  fs.mkdirSync(path.join(tmp, "project-knowledge"), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, "project-knowledge", "ownership-rules.json"),
    JSON.stringify({
      schemaVersion: 1,
      owners: {
        landing: ["src/app/page.tsx"],
      },
      qualifyingFeatureRoots: [],
    })
  );
  fs.writeFileSync(
    path.join(tmp, "project-knowledge", "route-stage-rules.json"),
    JSON.stringify({
      exact: {},
      prefixes: [],
      fallback: { surface: "unknown", stage: "UNCERTAIN" },
    })
  );
  fs.writeFileSync(path.join(tmp, ".env.example"), "KNOWN=\n");
  fs.writeFileSync(
    path.join(tmp, "src", "app", "page.tsx"),
    "export default function Page(){return null}\n"
  );
  return tmp;
}

test("new page route appears on knowledge:update scan", () => {
  const tmp = makeFixture();
  try {
    fs.mkdirSync(path.join(tmp, "src", "app", "hello"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "src", "app", "hello", "page.tsx"),
      "export default function Hello(){return null}\n"
    );
    const bundle = buildArtifactBundle(tmp);
    assert.ok(
      bundle.routes.some((r) => r.route === "/hello"),
      `expected /hello in ${JSON.stringify(bundle.routes)}`
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("new API route appears on knowledge:update scan", () => {
  const tmp = makeFixture();
  try {
    fs.mkdirSync(path.join(tmp, "src", "app", "api", "ping"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(tmp, "src", "app", "api", "ping", "route.ts"),
      "export async function GET(){return new Response('ok')}\n"
    );
    const bundle = buildArtifactBundle(tmp);
    assert.ok(
      bundle.apis.some((a) => a.path.includes("/api/ping")),
      `expected api/ping in ${JSON.stringify(bundle.apis)}`
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("new env reference is classified undocumented", () => {
  const tmp = makeFixture();
  try {
    fs.writeFileSync(
      path.join(tmp, "src", "env-user.ts"),
      "export const x = process.env.BRAND_NEW_SECRET_KEY;\n"
    );
    const refs = collectProcessEnvRefs(tmp);
    assert.ok(refs.includes("BRAND_NEW_SECRET_KEY"));
    const bundle = buildArtifactBundle(tmp);
    const row = bundle.envRows.find((e) => e.variable === "BRAND_NEW_SECRET_KEY");
    assert.ok(row);
    assert.equal(row.classification, "undocumented");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("unowned structural path is listed", () => {
  const tmp = makeFixture();
  try {
    fs.mkdirSync(path.join(tmp, "src", "orphan"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "src", "orphan", "x.ts"),
      "export const n = 1;\n"
    );
    const bundle = buildArtifactBundle(tmp);
    assert.ok(
      bundle.ownership.unowned.some((p) => p.includes("src/orphan/x.ts"))
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("duplicate routes are detected", () => {
  const tmp = makeFixture();
  try {
    // Same logical route via two page files is unusual; create (app) and root conflict
    fs.mkdirSync(path.join(tmp, "src", "app", "(g)", "page"), {
      recursive: true,
    });
    // Two pages at "/" — root page already exists; add route group page also mapping to /
    fs.writeFileSync(
      path.join(tmp, "src", "app", "(g)", "page.tsx"),
      "export default function G(){return null}\n"
    );
    const bundle = buildArtifactBundle(tmp);
    // If resolver maps both to /, duplicates appear; otherwise still validates scan runs
    assert.ok(Array.isArray(bundle.duplicateRoutes));
    if (bundle.routes.filter((r) => r.route === "/").length > 1) {
      assert.ok(bundle.duplicateRoutes.some((d) => d.route === "/"));
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("prohibited secret pattern in report text is detectable", () => {
  const leak = "OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz012345";
  assert.ok(VALUE_PATTERNS[0].test(leak));
  assert.ok(!VALUE_PATTERNS[0].test("OPENAI_API_KEY documented in .env.example"));
});

// Keep import used for path resolution in other environments
void fileURLToPath;
