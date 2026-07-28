import fs from "node:fs";
import path from "node:path";
import { getRepoRoot } from "../../lib/repo.js";
import { ok, type ToolEnvelope } from "../../contracts/envelope.js";
import { stageFor } from "./route-stage.js";

function walkPages(dir: string, out: string[]) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ent.name === "node_modules" ||
      ent.name === "Refrence folder" ||
      ent.name === "reference-library"
    ) {
      continue;
    }
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkPages(full, out);
    else if (ent.name === "page.tsx") out.push(full);
  }
}

function toRoute(rel: string): string {
  const parts = rel.split(/[/\\]/);
  const idx = parts.indexOf("app");
  const segs = parts
    .slice(idx + 1, -1)
    .filter((s) => !(s.startsWith("(") && s.endsWith(")")));
  return segs.length ? "/" + segs.join("/") : "/";
}

function isReferenceLibraryLeak(sourceFile: string): boolean {
  return (
    sourceFile.includes("Refrence folder") ||
    sourceFile.includes("reference-library")
  );
}

export async function mmRouteInventory(): Promise<
  ToolEnvelope<Record<string, unknown>>
> {
  const root = getRepoRoot();
  const pages: string[] = [];
  walkPages(path.join(root, "src", "app"), pages);
  pages.sort();
  const routes = pages.map((abs) => {
    const sourceFile = path.relative(root, abs).split(path.sep).join("/");
    const route = toRoute(sourceFile);
    return { route, sourceFile, ...stageFor(route) };
  });
  const warnings: string[] = [];
  if (routes.some((r) => isReferenceLibraryLeak(r.sourceFile))) {
    warnings.push("reference-library leaked into inventory — bug");
  }
  return ok(
    {
      routes,
      excludedRoots: [
        "Refrence folder",
        "reference-library",
        "node_modules",
        ".next",
      ],
      warnings,
    },
    { warnings, uncertainty: "low" }
  );
}
