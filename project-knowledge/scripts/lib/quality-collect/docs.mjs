import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../scan/frontmatter.mjs";
import { daysSince } from "./util.mjs";

export function collectDocFindings(root, ownershipRules, staleDays) {
  const today = new Date().toISOString().slice(0, 10);
  const expired = (ownershipRules.exceptions || []).filter(
    (ex) => ex.expires && ex.expires < today
  );

  const featureDocByRoot = {
    "src/engine/discovery": "discovery-engine",
    "src/components/discovery": "discovery-engine",
    "src/seo": "site-seo",
  };

  const missingFeatureDocs = [];
  for (const featRoot of ownershipRules.qualifyingFeatureRoots || []) {
    if (featRoot.includes("landing")) continue;
    const abs = path.join(root, featRoot);
    if (!fs.existsSync(abs)) continue;
    const normalized = featRoot.replace(/\\/g, "/");
    const docBase =
      featureDocByRoot[normalized] || path.basename(featRoot);
    const ok = fs.existsSync(
      path.join(root, "project-knowledge", "FEATURES", `${docBase}.md`)
    );
    if (!ok) missingFeatureDocs.push(featRoot);
  }

  let currentStateStale = [];
  const csPath = path.join(root, "project-knowledge", "CURRENT_STATE.md");
  if (!fs.existsSync(csPath)) currentStateStale = ["CURRENT_STATE.md missing"];
  else {
    const { data } = parseFrontmatter(fs.readFileSync(csPath, "utf8"));
    const lv = data.last_verified;
    if (!lv) currentStateStale = ["CURRENT_STATE.md missing last_verified"];
    else if (daysSince(String(lv)) > staleDays) {
      currentStateStale = [
        `CURRENT_STATE last_verified=${lv} is ${daysSince(String(lv))}d old (limit ${staleDays}d)`,
      ];
    }
  }

  let tsconfigStrictFail = [];
  const tsconfigPath = path.join(root, "tsconfig.json");
  if (!fs.existsSync(tsconfigPath))
    tsconfigStrictFail = ["tsconfig.json missing"];
  else if (
    !/"strict"\s*:\s*true\b/.test(fs.readFileSync(tsconfigPath, "utf8"))
  ) {
    tsconfigStrictFail = [
      "compilerOptions.strict is not set to true in tsconfig.json",
    ];
  }

  const eslintPresent = [
    "eslint.config.mjs",
    "eslint.config.js",
    "eslint.config.cjs",
    ".eslintrc.js",
    ".eslintrc.cjs",
    ".eslintrc.json",
  ].some((n) => fs.existsSync(path.join(root, n)));

  const ciKnowledge =
    fs.existsSync(
      path.join(root, ".github", "workflows", "knowledge-check.yml")
    ) ||
    fs.existsSync(
      path.join(root, ".github", "workflows", "knowledge-check.yaml")
    );

  const missingPublicApis = [];
  for (const [name, entries] of Object.entries(
    ownershipRules.publicApiEntrypoints || {}
  )) {
    for (const entry of entries) {
      if (!fs.existsSync(path.join(root, entry))) {
        missingPublicApis.push(`${name}: missing ${entry}`);
      }
    }
  }

  return {
    expired,
    missingFeatureDocs,
    currentStateStale,
    tsconfigStrictFail,
    eslintPresent,
    ciKnowledge,
    missingPublicApis,
  };
}
