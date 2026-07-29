import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = path.join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

function rel(file: string): string {
  return path.relative(process.cwd(), file).replace(/\\/g, "/");
}

describe("Brain ownership architecture boundaries", () => {
  it("src/brain does not import React, Next UI, browser storage, or dashboard", () => {
    const brainFiles = walk(path.join(root, "brain"));
    const forbidden = [
      /from\s+["']react["']/,
      /from\s+["']react-dom/,
      /from\s+["']next\/(?!server)/,
      /from\s+["']@\/components\//,
      /localStorage/,
      /sessionStorage/,
      /useRouter\(/,
    ];
    for (const file of brainFiles) {
      if (file.includes(".test.")) continue;
      const src = readFileSync(file, "utf8");
      for (const pattern of forbidden) {
        assert.doesNotMatch(
          src,
          pattern,
          `${rel(file)} violates Brain ownership (${pattern})`
        );
      }
    }
  });

  it("API routes do not import CSV history adapters or parse history CSV path", () => {
    const apiRoot = path.join(root, "app", "api", "brain");
    const files = walk(apiRoot);
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      assert.doesNotMatch(
        src,
        /csv-topic-generation-repository/,
        `${rel(file)} must not import CSV adapter directly`
      );
      assert.doesNotMatch(
        src,
        /topic-generation-history\.csv/,
        `${rel(file)} must not hardcode history CSV path`
      );
      assert.doesNotMatch(
        src,
        /parseFixtureCsv|parseCsv/,
        `${rel(file)} must not parse CSV in the route`
      );
    }
  });

  it("content-atom route is transport-only via use case", () => {
    const file = path.join(root, "app", "api", "brain", "content-atom", "route.ts");
    const src = readFileSync(file, "utf8");
    assert.match(src, /buildContentAtomFromHandoff/);
    assert.doesNotMatch(src, /createBrandContextRepository/);
    assert.doesNotMatch(src, /runCoreContentBrain/);
    assert.doesNotMatch(src, /data\/companies\/[^"']*approved\.csv/);
  });

  it("UI does not import CsvTopicGenerationRepository or history CSV", () => {
    const uiRoots = [
      path.join(root, "components", "dashboard", "marketing-topic"),
      path.join(root, "components", "dashboard", "content"),
    ];
    for (const uiRoot of uiRoots) {
      for (const file of walk(uiRoot)) {
        if (file.includes(".test.")) continue;
        const src = readFileSync(file, "utf8");
        assert.doesNotMatch(src, /CsvTopicGenerationRepository/);
        assert.doesNotMatch(src, /csv-topic-generation-repository/);
        assert.doesNotMatch(src, /topic-generation-history\.csv/);
        assert.doesNotMatch(src, /create-brand-context-repository/);
        assert.doesNotMatch(src, /createFixtureBrandContextRepository/);
        assert.doesNotMatch(src, /fixture-repository/);
      }
    }
  });

  it("only CSV adapter references topic-generation-history.csv", () => {
    const all = walk(root).filter((f) => !f.includes(".test."));
    for (const file of all) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("topic-generation-history.csv")) continue;
      const r = rel(file);
      assert.ok(
        r.includes("csv-topic-generation-repository") ||
          r.includes("store/paths.ts") ||
          r.includes("create-topic-generation-repository"),
        `Unexpected history CSV reference in ${r}`
      );
    }
  });

  it("JSON topic-generation-store is deleted", () => {
    const gone = path.join(root, "brain", "store", "topic-generation-store.ts");
    assert.equal(
      (() => {
        try {
          statSync(gone);
          return true;
        } catch {
          return false;
        }
      })(),
      false
    );
  });

  it("brain/core domain does not import OpenAI, Next, MCP, or process.env", () => {
    const coreFiles = walk(path.join(root, "brain", "core")).filter(
      (f) => !f.includes(".test.")
    );
    for (const file of coreFiles) {
      const src = readFileSync(file, "utf8");
      assert.doesNotMatch(src, /from\s+["']openai["']/, rel(file));
      assert.doesNotMatch(src, /from\s+["']next\//, rel(file));
      assert.doesNotMatch(src, /mcp\//, rel(file));
      assert.doesNotMatch(src, /process\.env/, rel(file));
    }
  });

  it("src/ and MCP never import Refrence or reference-library as a module (exclusion lists OK)", () => {
    const allowMention = new Set([
      "src/lib/project-knowledge/retrieve.ts",
      "src/seo/verification/brand-scan-shared.ts",
      "src/seo/config/brand-history.ts",
      "mcp/src/security/paths.ts",
      "mcp/src/tools/context/route-inventory.ts",
      "mcp/src/create-server/reg-context.ts",
    ]);
    const roots = [
      path.join(root, "brain"),
      path.join(root, "app"),
      path.join(root, "components"),
      path.join(root, "lib"),
      path.join(process.cwd(), "mcp", "src"),
    ];
    for (const dir of roots) {
      let files: string[] = [];
      try {
        files = walk(dir);
      } catch {
        continue;
      }
      for (const file of files) {
        if (file.includes(".test.")) continue;
        const r = rel(file);
        const src = readFileSync(file, "utf8");
        assert.doesNotMatch(
          src,
          /from\s+["'][^"']*Refrence/,
          `${r} must not import Refrence`
        );
        assert.doesNotMatch(
          src,
          /from\s+["'][^"']*reference-library/,
          `${r} must not import reference-library`
        );
        if (allowMention.has(r)) continue;
        assert.doesNotMatch(
          src,
          /Refrence folder/,
          `${r} must not reference Refrence folder except exclusion allowlist`
        );
        assert.doesNotMatch(
          src,
          /reference-library/,
          `${r} must not reference reference-library except exclusion allowlist`
        );
      }
    }
  });

  it("provider selection stays in canonical policy modules", () => {
    const brainFiles = walk(path.join(root, "brain")).filter(
      (f) => !f.includes(".test.")
    );
    const allowed = new Set([
      "src/brain/policy/provider-policy.ts",
      "src/brain/content/providers/resolve-provider.ts",
    ]);
    for (const file of brainFiles) {
      const r = rel(file);
      if (allowed.has(r)) continue;
      if (r.includes("/providers/") && r.endsWith("resolve-provider.ts")) {
        continue;
      }
      const src = readFileSync(file, "utf8");
      // Local polish/hook resolveProvider helpers are named differently or scoped;
      // ban a second directions policy surface.
      assert.doesNotMatch(
        src,
        /export function selectDirectionsProvider/,
        `${r} must not redefine selectDirectionsProvider`
      );
    }
  });
});
