export function collectImportSpecs(text) {
  const specs = [];
  const re = /from\s+["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(text))) specs.push(m[1]);
  return specs;
}

export function layersForImports(specs) {
  const layers = new Set();
  for (const s of specs) {
    if (s === "react" || s.startsWith("react/") || s.startsWith("@/components/"))
      layers.add("ui");
    if (s.startsWith("@/engine") || s.includes("/engine/")) layers.add("engine");
    if (s.startsWith("@/db") || s.startsWith("drizzle-orm")) layers.add("db");
    if (s === "next/server" || s === "server-only") layers.add("server");
    if (s.startsWith("next/")) layers.add("next");
  }
  return [...layers];
}
