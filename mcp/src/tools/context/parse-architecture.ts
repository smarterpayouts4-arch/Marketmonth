import { sha16 } from "../../lib/repo.js";
import { ok, type ToolEnvelope } from "../../contracts/envelope.js";
import { resolveProjectDoc } from "../../security/paths.js";

export async function mmArchitectureMap(): Promise<ToolEnvelope<Record<string, unknown>>> {
  const doc = await resolveProjectDoc("architecture");
  const surfaces: { surface: string; stage: string; module: string; route: string }[] = [];
  const table =
    doc.text.match(
      /\| Surface \| Loop stage \| Current owning module \| App route \|([\s\S]*?)\n\n/
    )?.[1] ?? "";
  for (const line of table.split("\n")) {
    if (!line.startsWith("|") || line.includes("---") || line.includes("Surface")) continue;
    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cols.length >= 4) {
      surfaces.push({
        surface: cols[0],
        stage: cols[1],
        module: cols[2].replace(/`/g, ""),
        route: cols[3].replace(/`/g, ""),
      });
    }
  }
  const rules: string[] = [];
  if (/must \*\*not\*\* import another feature/i.test(doc.text)) {
    rules.push("No cross-feature internal imports");
  }
  if (/Forbidden:.*components\/\*.*engine/i.test(doc.text)) {
    rules.push("UI must not import engine; engine must not import UI");
  }

  return ok(
    {
      surfaces,
      routeStageMap: surfaces.map((s) => ({ route: s.route, stage: s.stage, surface: s.surface })),
      rules,
      uncertainty: [] as string[],
      note: "Live route existence is in mm_route_inventory / generated/maps/ROUTE_MAP.md — not inferred here.",
    },
    {
      source: { path: doc.rel, contentHash: sha16(doc.text), mtimeMs: doc.mtimeMs },
      warnings: surfaces.length ? [] : ["Architecture surface table parse empty"],
      uncertainty: surfaces.length ? "low" : "medium",
    }
  );
}
