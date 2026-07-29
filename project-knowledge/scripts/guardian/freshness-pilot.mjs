import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Pilot: warn-only change-based freshness for CURRENT_STATE + PRODUCT.
 * Never hard-fails. Skips broad globs (**). False positives expected.
 */

const PILOT_DOCS = [
  "project-knowledge/CURRENT_STATE.md",
  "project-knowledge/PRODUCT.md",
];

function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return {};
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) return {};
  const block = text.slice(4, end);
  /** @type {Record<string, string | string[]>} */
  const data = {};
  let listKey = null;
  /** @type {string[]} */
  let list = [];
  for (const line of block.split("\n")) {
    if (listKey && /^\s+-\s+/.test(line)) {
      list.push(line.replace(/^\s+-\s+/, "").trim());
      continue;
    }
    if (listKey) {
      data[listKey] = list;
      listKey = null;
      list = [];
    }
    const m = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2].trim();
    if (val === "" || val === "|" || val === ">") {
      listKey = key;
      list = [];
    } else {
      data[key] = val.replace(/^["']|["']$/g, "");
    }
  }
  if (listKey) data[listKey] = list;
  return data;
}

function gitChangedAfter(root, commit, relPath) {
  try {
    const out = execFileSync(
      "git",
      ["log", "-1", "--format=%H", `${commit}..HEAD`, "--", relPath],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

function commitExists(root, commit) {
  try {
    execFileSync("git", ["cat-file", "-e", `${commit}^{commit}`], {
      cwd: root,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} root
 * @param {{ warn: (code: string, message: string) => void }} emit
 */
export function checkFreshnessPilot(root, { warn }) {
  for (const rel of PILOT_DOCS) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, "utf8");
    const fm = parseFrontmatter(text);
    const commit = typeof fm.verified_against_commit === "string"
      ? fm.verified_against_commit
      : null;
    if (!commit) {
      warn(
        "PK-WARN-008",
        `Freshness pilot: ${rel} missing verified_against_commit (optional)`
      );
      continue;
    }
    if (!commitExists(root, commit)) {
      warn(
        "PK-WARN-008",
        `Freshness pilot: ${rel} verified_against_commit=${commit} not found in git`
      );
      continue;
    }

    const paths = Array.isArray(fm.related_paths) ? fm.related_paths : [];
    const narrow = paths
      .map((p) => String(p).replace(/\\/g, "/"))
      .filter((p) => p && !p.includes("**") && !p.endsWith("/*"));

    if (narrow.length === 0) {
      warn(
        "PK-WARN-008",
        `Freshness pilot: ${rel} has no narrow related_paths to check (globs skipped)`
      );
      continue;
    }

    for (const p of narrow) {
      const target = path.join(root, p);
      if (!fs.existsSync(target)) continue;
      if (gitChangedAfter(root, commit, p)) {
        warn(
          "PK-WARN-008",
          `Freshness pilot: ${rel} related path changed after ${commit}: ${p}`
        );
      }
    }
  }
}
