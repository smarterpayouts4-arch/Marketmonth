/**
 * Shared structural-path helpers for APS Knowledge OS hooks.
 */

export const STRUCTURAL_PREFIXES = [
  "src/app/",
  "src/components/",
  "src/engine/",
  "src/db/",
  "project-knowledge/",
];

export const STRUCTURAL_FILES = new Set([
  ".env.example",
  "project-knowledge/ownership-rules.json",
]);

/** Normalize to repo-relative posix path */
export function normalizeRel(p) {
  if (!p || typeof p !== "string") return null;
  let n = p.replace(/\\/g, "/");
  // Strip absolute prefix if present
  const markers = ["/MarketMonth/", "MarketMonth/"];
  for (const m of markers) {
    const i = n.lastIndexOf(m);
    if (i >= 0) n = n.slice(i + m.length);
  }
  n = n.replace(/^\.\//, "");
  return n;
}

/**
 * Extract file path from Cursor preToolUse / tool stdin payload.
 */
export function extractToolPath(payload) {
  if (!payload || typeof payload !== "object") return null;
  const input =
    payload.tool_input ||
    payload.toolInput ||
    payload.input ||
    payload.arguments ||
    {};
  const candidates = [
    input.path,
    input.file_path,
    input.filePath,
    input.target_notebook,
    input.targetNotebook,
    payload.path,
    payload.file_path,
  ];
  for (const c of candidates) {
    const n = normalizeRel(c);
    if (n) return n;
  }
  return null;
}

/**
 * Structural Knowledge OS paths — CSS-only skips unless under project-knowledge/.
 */
export function isStructuralPath(rel) {
  const n = normalizeRel(rel);
  if (!n) return false;
  if (STRUCTURAL_FILES.has(n)) return true;
  if (n.endsWith(".css") && !n.startsWith("project-knowledge/")) return false;
  for (const prefix of STRUCTURAL_PREFIXES) {
    if (n.startsWith(prefix) || n === prefix.slice(0, -1)) return true;
  }
  return false;
}

export function anyStructural(paths) {
  if (!Array.isArray(paths)) return false;
  return paths.some((p) => isStructuralPath(p));
}
