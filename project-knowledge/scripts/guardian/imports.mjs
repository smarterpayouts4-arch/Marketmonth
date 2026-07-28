import fs from "node:fs";
import path from "node:path";
import { relPosix, walkFiles } from "../lib/scan.mjs";

/**
 * @param {string} root
 * @param {string} fromPrefix
 * @param {string[]} disallow
 * @param {string} severity
 * @param {{ fail: (code: string, message: string) => void, warn: (code: string, message: string) => void }} emit
 */
export function scanImports(root, fromPrefix, disallow, severity, { fail, warn }) {
  const base = path.join(root, fromPrefix.replace(/\/\*\*$/, ""));
  if (!fs.existsSync(base)) return;
  const files = walkFiles(base, (f) => /\.(ts|tsx)$/.test(f));
  for (const abs of files) {
    const text = fs.readFileSync(abs, "utf8");
    const rel = relPosix(root, abs);
    if (fromPrefix.startsWith("src/components")) {
      if (/from\s+["']@\/engine(\/|["'])/.test(text)) {
        const msg = `${rel} imports private engine internals (@/engine)`;
        if (severity === "error") fail("PK-HARD-006", msg);
        else warn("PK-WARN-005", msg);
      }
      if (
        /from\s+["']@\/db(\/|["'])/.test(text) ||
        /from\s+["']drizzle-orm/.test(text)
      ) {
        const msg = `${rel} imports database/infrastructure from UI`;
        if (severity === "error") fail("PK-HARD-008", msg);
        else warn("PK-WARN-006", msg);
      }
    }
    for (const bad of disallow) {
      if (bad === "react" || bad === "react-dom") {
        if (new RegExp(`from\\s+["']${bad}["']`).test(text) || text.includes(`from "react/`)) {
          const msg = `${rel} imports ${bad}`;
          if (severity === "error") fail("PK-HARD-007", msg);
          else warn("PK-WARN-004", msg);
        }
      } else if (bad.startsWith("next/")) {
        if (text.includes(`from "${bad}"`) || text.includes(`from '${bad}'`)) {
          const msg = `${rel} imports ${bad}`;
          if (severity === "error") fail("PK-HARD-007", msg);
          else warn("PK-WARN-004", msg);
        }
      }
    }
  }
}

/**
 * @param {string} root
 * @param {Array<{ from: string, disallow: string[], severity: string }>} dependencyRules
 * @param {{ fail: (code: string, message: string) => void, warn: (code: string, message: string) => void }} emit
 */
export function checkDependencyRules(root, dependencyRules, emit) {
  for (const rule of dependencyRules || []) {
    if (rule.from.startsWith("src/engine")) {
      scanImports(root, "src/engine/**", rule.disallow, rule.severity, emit);
    }
    if (rule.from.startsWith("src/components")) {
      scanImports(root, "src/components/**", rule.disallow, rule.severity, emit);
    }
  }
}
