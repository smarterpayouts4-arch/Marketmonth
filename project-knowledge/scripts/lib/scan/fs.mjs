import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { EXCLUDE_DIR_NAMES } from "./roots.mjs";

export function walkFiles(root, pred) {
  const out = [];
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (EXCLUDE_DIR_NAMES.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (pred(full, ent.name)) out.push(full);
    }
  }
  walk(root);
  return out.sort((a, b) => a.localeCompare(b));
}

export function relPosix(root, abs) {
  return path.relative(root, abs).split(path.sep).join("/");
}

export function normalizeText(text) {
  return text.replace(/\r\n/g, "\n").replace(/\s+$/g, "") + "\n";
}

export function contentHash(text) {
  return crypto.createHash("sha256").update(normalizeText(text)).digest("hex").slice(0, 16);
}
