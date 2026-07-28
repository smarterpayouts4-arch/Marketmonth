import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const BLOCKED_PREFIXES = [
  ".env",
  "node_modules/",
  "Refrence folder/",
  "reference-library/",
  ".git/",
  ".next/",
];

const SEED_DOCS = [
  "project-knowledge/CURRENT_STATE.md",
  "project-knowledge/ARCHITECTURE.md",
  "project-knowledge/PRODUCT.md",
  "project-knowledge/CONTENT_BRAIN.md",
  "project-knowledge/DOMAIN_GLOSSARY.md",
  "project-knowledge/README.md",
  "project-knowledge/FEATURES/discovery-engine.md",
  "project-knowledge/IDEA_LAB_TOPIC_STRATEGY.md",
  "project-knowledge/IDEA_LAB_DIRECTION_HARDENING.md",
  "project-knowledge/generated/indexes/manifest.json",
  "project-knowledge/generated/maps/FILE_OWNERSHIP.md",
  "project-knowledge/generated/maps/ROUTE_MAP.md",
  "project-knowledge/generated/maps/API_MAP.md",
  "project-knowledge/generated/reports/STRUCTURE_WARNINGS.md",
];

/** Exported for retrieval regression tests. */
export { SEED_DOCS };

function isBlocked(rel: string): boolean {
  const n = rel.replace(/\\/g, "/");
  if (n.includes("..")) return true;
  for (const b of BLOCKED_PREFIXES) {
    if (n === b || n.startsWith(b) || n.includes(`/${b}`)) return true;
  }
  if (n.startsWith(".env") || n.includes("/.env")) return true;
  return false;
}

function readSafe(rel: string, maxChars = 12_000): string | null {
  const n = rel.replace(/\\/g, "/");
  if (isBlocked(n)) return null;
  const abs = path.resolve(ROOT, n);
  const rootAbs = path.resolve(ROOT);
  if (!abs.startsWith(rootAbs + path.sep) && abs !== rootAbs) return null;
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
  const text = fs.readFileSync(abs, "utf8");
  return text.length > maxChars ? text.slice(0, maxChars) + "\n…[truncated]" : text;
}

function scoreDoc(question: string, rel: string, text: string): number {
  const q = question.toLowerCase();
  const tokens = q.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  let score = 0;
  const hay = (rel + "\n" + text).toLowerCase();
  for (const t of tokens) {
    if (hay.includes(t)) score += 1;
  }
  if (rel.includes("CURRENT_STATE") && /mock|live|status|implemented/.test(q)) score += 3;
  if (rel.includes("ARCHITECTURE") && /architect|owner|folder|route/.test(q)) score += 3;
  if (rel.includes("discovery") && /discover|crawl|brand|learn/.test(q)) score += 3;
  if (
    rel.includes("CONTENT_BRAIN") &&
    /content|direction|brain|brand core|six idea|atom|youtube short|strategize/.test(
      q
    )
  ) {
    score += 5;
  }
  if (rel.includes("DOMAIN_GLOSSARY") && /glossary|term|terminology/.test(q)) {
    score += 3;
  }
  if (rel.includes("ROUTE_MAP") && /route|page|url/.test(q)) score += 2;
  if (rel.includes("API_MAP") && /api|endpoint/.test(q)) score += 2;
  return score;
}

export type RetrievedChunk = { path: string; text: string; score: number };

/** Local retrieval over project-knowledge (+ referenced src paths). No secrets. */
export function retrieveProjectKnowledge(question: string): RetrievedChunk[] {
  const scored: RetrievedChunk[] = [];

  for (const rel of SEED_DOCS) {
    const text = readSafe(rel);
    if (!text) continue;
    scored.push({ path: rel, text, score: scoreDoc(question, rel, text) });
  }

  // Pull related_paths from FEATURES / CURRENT_STATE frontmatter-ish mentions of src/
  const srcHints = new Set<string>();
  for (const c of scored) {
    const matches = c.text.matchAll(/src\/[A-Za-z0-9_./\-]+/g);
    for (const m of matches) {
      const p = m[0].replace(/[),.`]+$/, "");
      if (p.endsWith(".ts") || p.endsWith(".tsx")) srcHints.add(p);
    }
  }

  for (const rel of [...srcHints].slice(0, 8)) {
    if (isBlocked(rel)) continue;
    const text = readSafe(rel, 8_000);
    if (!text) continue;
    scored.push({
      path: rel,
      text,
      score: scoreDoc(question, rel, text) + 1,
    });
  }

  return scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export function buildAskContext(question: string): {
  chunks: RetrievedChunk[];
  promptContext: string;
} {
  const chunks = retrieveProjectKnowledge(question);
  const fallback =
    chunks.length > 0
      ? chunks
      : SEED_DOCS.slice(0, 4)
          .map((path) => {
            const text = readSafe(path);
            return text ? { path, text, score: 0 } : null;
          })
          .filter(Boolean) as RetrievedChunk[];

  const promptContext = fallback
    .map((c) => `### ${c.path}\n\n${c.text}`)
    .join("\n\n---\n\n");

  return { chunks: fallback, promptContext };
}
