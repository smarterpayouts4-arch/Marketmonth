/**
 * Resolve a Next.js App Router file path to a URL pathname.
 * Supports route groups, dynamic, catch-all, optional catch-all.
 * Parallel (@) and intercepting ((.)) segments: documented v1 support level.
 */

/**
 * @param {string} relPosix - repo-relative posix path e.g. src/app/(app)/brand/page.tsx
 * @param {{ kind?: 'page' | 'route' }} [opts]
 * @returns {string | null} URL path starting with / or null if not a routable leaf
 */
export function resolveNextRoute(relPosix, opts = {}) {
  const kind = opts.kind || inferKind(relPosix);
  if (!kind) return null;

  const parts = relPosix.replace(/\\/g, "/").split("/");
  const appIdx = parts.indexOf("app");
  if (appIdx < 0) return null;

  const leaf = parts[parts.length - 1];
  if (kind === "page" && leaf !== "page.tsx" && leaf !== "page.ts" && leaf !== "page.jsx" && leaf !== "page.js") {
    return null;
  }
  if (kind === "route" && leaf !== "route.ts" && leaf !== "route.js") {
    return null;
  }

  const segs = parts.slice(appIdx + 1, -1);
  const urlSegs = [];

  for (const seg of segs) {
    // Route groups: (name) — omitted from URL
    if (seg.startsWith("(") && seg.endsWith(")") && !seg.startsWith("(.")) {
      continue;
    }
    // Intercepting routes: (.)folder, (..)folder, (...)folder — omit from URL path for inventory
    if (/^\(\.{1,3}\)/.test(seg) || seg.startsWith("(.)") || seg.startsWith("(..)") || seg.startsWith("(...)")) {
      continue;
    }
    // Parallel routes: @slot — omit from primary URL inventory (v1)
    if (seg.startsWith("@")) {
      continue;
    }
    // Optional catch-all: [[...slug]]
    if (seg.startsWith("[[...") && seg.endsWith("]]")) {
      const name = seg.slice(5, -2);
      urlSegs.push(`[[...${name}]]`);
      continue;
    }
    // Catch-all: [...slug]
    if (seg.startsWith("[...") && seg.endsWith("]")) {
      const name = seg.slice(4, -1);
      urlSegs.push(`[...${name}]`);
      continue;
    }
    // Dynamic: [id]
    if (seg.startsWith("[") && seg.endsWith("]") && !seg.startsWith("[...")) {
      const name = seg.slice(1, -1);
      urlSegs.push(`[${name}]`);
      continue;
    }
    urlSegs.push(seg);
  }

  if (urlSegs.length === 0) return "/";
  return "/" + urlSegs.join("/");
}

function inferKind(relPosix) {
  const base = relPosix.replace(/\\/g, "/").split("/").pop() || "";
  if (base.startsWith("page.")) return "page";
  if (base.startsWith("route.")) return "route";
  return null;
}

/**
 * @param {string} relPosix
 * @returns {'page' | 'route' | null}
 */
export function routeFileKind(relPosix) {
  return inferKind(relPosix);
}
