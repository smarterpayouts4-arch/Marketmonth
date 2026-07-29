import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

function rel(file: string): string {
  return path.relative(root, file).replace(/\\/g, "/");
}

describe("two-branch split boundaries", () => {
  it("runtime crawl path has no isZynavaHost / ZYNAVA_EXTRA_URLS hardcodes", () => {
    const files = [
      "src/engine/discovery/crawl-extras.ts",
      "src/engine/discovery/analyze-website.ts",
      "src/engine/discovery/crawl-website/crawl.ts",
      "src/engine/discovery/index.ts",
    ].map((f) => path.join(root, f));
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      assert.doesNotMatch(
        src,
        /\bisZynavaHost\b/,
        `${rel(file)} must not reference isZynavaHost`
      );
      assert.doesNotMatch(
        src,
        /\bZYNAVA_EXTRA_URLS\b/,
        `${rel(file)} must not reference ZYNAVA_EXTRA_URLS`
      );
    }
    const config = readFileSync(
      path.join(root, "src/engine/discovery/company-discovery-config.ts"),
      "utf8"
    );
    assert.match(config, /extraSeedUrls/);
    assert.match(config, /getCompanyDiscoveryConfig/);
  });

  it("discovery UI does not import engine/discovery or brain", () => {
    const uiRoot = path.join(root, "src/components/discovery");
    for (const file of walk(uiRoot)) {
      if (file.includes(".test.")) continue;
      const src = readFileSync(file, "utf8");
      assert.doesNotMatch(
        src,
        /from\s+["']@\/engine\/discovery/,
        `${rel(file)} must not import @/engine/discovery`
      );
      assert.doesNotMatch(
        src,
        /from\s+["']@\/brain\//,
        `${rel(file)} must not import @/brain`
      );
    }
  });

  it("production brain code does not import @/engine/discovery", () => {
    const brainRoot = path.join(root, "src/brain");
    for (const file of walk(brainRoot)) {
      if (file.includes(".test.")) continue;
      const src = readFileSync(file, "utf8");
      assert.doesNotMatch(
        src,
        /from\s+["']@\/engine\/discovery/,
        `${rel(file)} must not import @/engine/discovery`
      );
    }
  });

  it("getBrandCore has no silent default brand / fixture alias table", () => {
    const src = readFileSync(
      path.join(root, "src/brain/core/get-brand-core.ts"),
      "utf8"
    );
    assert.doesNotMatch(src, /KNOWN_FIXTURE_ADAPTERS/);
    assert.doesNotMatch(src, /fixture:\s*DEFAULT_FIXTURE/);
    assert.doesNotMatch(src, /resolveZynavaFixtureAbsolute/);
    assert.match(src, /no silent default brand/);
  });

  it("intent status and DiscoveryIntent UI are gone", () => {
    const types = readFileSync(
      path.join(root, "src/components/discovery/types.ts"),
      "utf8"
    );
    assert.doesNotMatch(types, /\|\s*"intent"/);
    assert.throws(
      () =>
        readFileSync(
          path.join(root, "src/components/discovery/discovery-intent.tsx"),
          "utf8"
        ),
      /ENOENT/
    );
  });

  it("Zynava-named fixture loader modules are gone", () => {
    assert.throws(
      () =>
        readFileSync(
          path.join(root, "src/lib/dev/load-zynava-fixture.ts"),
          "utf8"
        ),
      /ENOENT/
    );
    assert.throws(
      () =>
        readFileSync(
          path.join(root, "src/lib/dev/zynava-fixture-paths.ts"),
          "utf8"
        ),
      /ENOENT/
    );
  });

  it("legacy persist helpers and buildStrategyInfluence are gone", () => {
    assert.throws(
      () =>
        readFileSync(
          path.join(root, "src/engine/discovery/persist/legacy.ts"),
          "utf8"
        ),
      /ENOENT/
    );
    const influence = readFileSync(
      path.join(
        root,
        "src/components/discovery/activation/strategy-influence.ts"
      ),
      "utf8"
    );
    assert.doesNotMatch(influence, /export function buildStrategyInfluence/);
    const persistBarrel = readFileSync(
      path.join(root, "src/engine/discovery/persist.ts"),
      "utf8"
    );
    assert.doesNotMatch(persistBarrel, /persist\/legacy/);
    assert.doesNotMatch(persistBarrel, /\bmemoryPersist\b/);
  });
});
