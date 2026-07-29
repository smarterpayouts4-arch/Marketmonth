import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return out;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(name) && !name.includes(".test.")) {
      out.push(full);
    }
  }
  return out;
}

function rel(file: string): string {
  return path.relative(root, file).replace(/\\/g, "/");
}

function read(file: string): string {
  return readFileSync(file, "utf8");
}

describe("Clean-slate discovery / Idea Lab boundaries", () => {
  it("Idea Lab use-cases do not import ContentBrainContext company readers or fixture CSV loaders", () => {
    const ideaLabDirs = [
      path.join(root, "src/brain/use-cases"),
      path.join(root, "src/app/dev/brain/idea-lab"),
    ];
    const files = ideaLabDirs.flatMap((d) => walk(d));
    for (const file of files) {
      const src = read(file);
      assert.doesNotMatch(
        src,
        /from\s+["']@\/brain\/content\/repository\/parse-fixture-csv["']/,
        `${rel(file)} must not import parseFixtureCsv`
      );
      assert.doesNotMatch(
        src,
        /from\s+["']@\/lib\/dev\/load-zynava-fixture["']/,
        `${rel(file)} must not import loadZynavaFixture`
      );
      assert.doesNotMatch(
        src,
        /readFileSync\([^)]*data\/companies\//,
        `${rel(file)} must not read approved CSV directly`
      );
    }
  });

  it("Idea Lab topic/direction entry points load Brand Core via repository only", () => {
    const topicEntry = path.join(
      root,
      "src/brain/use-cases/run-idea-lab-topic-candidates.ts"
    );
    const src = read(topicEntry);
    assert.match(
      src,
      /getBrandCoreRepository/,
      "run-idea-lab-topic-candidates must use BrandCoreRepository"
    );
    assert.doesNotMatch(src, /parseFixtureCsv/);
    assert.doesNotMatch(src, /readFileSync/);
  });

  it("only publish-company-profile materializer writes approved CSV among scripts", () => {
    const scriptsDir = path.join(root, "scripts");
    const writers: string[] = [];
    for (const file of walk(scriptsDir)) {
      const src = read(file);
      const basename = path.basename(file);
      if (basename === "publish-company-profile.ts") continue;
      if (
        /renameSync\([^)]*approvedCsv|writeFileSync\([^)]*data\/companies\/[^)]*approved\.csv/.test(
          src
        )
      ) {
        writers.push(rel(file));
      }
    }
    assert.deepEqual(
      writers,
      [],
      `Non-materializer scripts must not write approved CSV: ${writers.join(", ")}`
    );
  });

  it("active company-knowledge and Idea Lab paths ban SKU / catalogProducts / preferRulesDerived", () => {
    const activeDirs = [
      path.join(root, "src/engine/discovery/company-knowledge"),
      path.join(root, "src/brain/core"),
      path.join(root, "src/brain/use-cases"),
      path.join(root, "src/engine/discovery/publish"),
    ];
    const files = activeDirs.flatMap((d) => walk(d));
    for (const file of files) {
      const src = read(file);
      assert.doesNotMatch(
        src,
        /\bcatalogProducts\b/,
        `${rel(file)} still references catalogProducts`
      );
      assert.doesNotMatch(
        src,
        /\bpreferRulesDerived\b/,
        `${rel(file)} still references preferRulesDerived`
      );
      assert.doesNotMatch(
        src,
        /\bSKU\b/,
        `${rel(file)} still references SKU`
      );
    }
  });

  it("exactly one BrandCoreRepository implementation module exists", () => {
    const coreFiles = walk(path.join(root, "src/brain/core"));
    const repos = coreFiles.filter((f) =>
      /brand-core-repository\.ts$/.test(f)
    );
    assert.equal(repos.length, 1, `expected one repository file, got ${repos}`);
  });
});
