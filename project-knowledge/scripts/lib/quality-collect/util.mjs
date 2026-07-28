import { spawnSync } from "node:child_process";

export const NOT_EVALUATED = "NOT_EVALUATED";

export const FEATURE_DIRS = new Set([
  "discovery",
  "brand",
  "content",
  "dashboard",
  "landing",
]);

export function countLines(text) {
  if (!text) return 0;
  return text.replace(/\r\n/g, "\n").split("\n").length;
}

export function daysSince(isoDate) {
  const t = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(t)) return Infinity;
  return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
}

export function npmBin() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

export function runNpm(root, script, timeoutMs = 180_000) {
  // Allowlisted script names only — never interpolate untrusted input.
  if (!/^[a-z0-9:_-]+$/i.test(script)) {
    throw new Error(`Unsafe npm script name: ${script}`);
  }
  // Windows: npm.cmd needs shell, but shell+args triggers DEP0190 — use one string.
  if (process.platform === "win32") {
    return spawnSync(`${npmBin()} run ${script}`, {
      cwd: root,
      encoding: "utf8",
      shell: true,
      env: process.env,
      timeout: timeoutMs,
    });
  }
  return spawnSync(npmBin(), ["run", script], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    timeout: timeoutMs,
  });
}

export function featureOf(rel) {
  const m = rel.match(/^src\/components\/([^/]+)/);
  if (!m || !FEATURE_DIRS.has(m[1])) return null;
  return m[1];
}
