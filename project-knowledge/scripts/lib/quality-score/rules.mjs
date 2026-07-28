import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../scan.mjs";

export function loadQualityRules(root = repoRoot()) {
  const p = path.join(root, "project-knowledge", "quality-rules.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
