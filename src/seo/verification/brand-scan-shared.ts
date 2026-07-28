import fs from "node:fs";
import path from "node:path";

import { PRODUCT_IDENTITY } from "../config/product-identity";

export const REPO_ROOT = path.resolve(__dirname, "../../..");

export const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "coverage",
  "Refrence folder",
  "reference-library",
]);

export const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".md",
  ".mdx",
  ".json",
  ".css",
  ".html",
]);

export function collectTextFiles(dir: string, out: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTextFiles(full, out);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (TEXT_EXTENSIONS.has(ext)) out.push(full);
  }
}

export function brandNamePatterns(): { label: string; pattern: RegExp }[] {
  const names = [
    PRODUCT_IDENTITY.displayName,
    PRODUCT_IDENTITY.compactName,
    ...PRODUCT_IDENTITY.formerNames,
  ].filter(Boolean);
  return names.map((name) => ({
    label: name,
    pattern: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
  }));
}

export function toPosixRel(file: string, root = REPO_ROOT): string {
  return path.relative(root, file).split(path.sep).join("/");
}
