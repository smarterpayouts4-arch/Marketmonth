import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @param {string} sourceScript posix-ish path relative to repo root
 */
export function generatedHeader(sourceScript) {
  const src = String(sourceScript || "project-knowledge/scripts/update.mjs").replace(
    /\\/g,
    "/"
  );
  return `<!-- GENERATED FILE: DO NOT EDIT -->\n<!-- Source: ${src} -->\n`;
}

/** Default header for knowledge maps / indexes written by update.mjs */
export const GENERATED_HEADER = generatedHeader(
  "project-knowledge/scripts/update.mjs"
);

export const EXCLUDE_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  ".git",
  "Refrence folder",
  "reference-library",
  "generated",
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Repo root (MarketMonth/) — lib/scan → scripts → project-knowledge → root */
export function repoRoot() {
  return path.resolve(__dirname, "../../../..");
}

export function knowledgeRoot(root = repoRoot()) {
  return path.join(root, "project-knowledge");
}
