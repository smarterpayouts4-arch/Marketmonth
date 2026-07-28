import { sha16 } from "../../lib/repo.js";
import { ok, type ToolEnvelope } from "../../contracts/envelope.js";
import { resolveProjectDoc } from "../../security/paths.js";

export type ProductOverview = {
  northStar: string;
  invariant: string;
  stages: { id: string; summary: string }[];
  domainTerms: { contentUniverse: string };
};

export async function mmProductOverview(): Promise<ToolEnvelope<ProductOverview>> {
  const doc = await resolveProjectDoc("product");
  const north =
    doc.text.match(/## MARKETMONTH NORTH STAR\s*\n+([\s\S]*?)\n+## /)?.[1]?.trim() ??
    "";
  const invariant =
    doc.text.match(/\*\*MarketMonth is strategy-first, not asset-first\.\*\*/)?.[0]?.replace(/\*\*/g, "") ??
    "MarketMonth is strategy-first, not asset-first.";
  const loopBlock =
    doc.text.match(/## PRODUCT LOOP\s*\n+([\s\S]*?)\n+## /)?.[1] ?? "";
  const stages: ProductOverview["stages"] = [];
  for (const m of loopBlock.matchAll(/(\d+)\.\s+([A-Z +]+)\s*\n\s*([^\n]+)/g)) {
    stages.push({ id: m[2].trim().replace(/\s+/g, "_"), summary: m[3].trim() });
  }
  const cuDef =
    doc.text
      .match(/\*\*Definition:\*\*\s*([^\n]+)/)?.[1]
      ?.trim() ??
    "One strategic topic becomes a coordinated family of assets.";

  if (!north || stages.length < 6) {
    return {
      status: "partial",
      data: {
        northStar: north,
        invariant,
        stages,
        domainTerms: { contentUniverse: cuDef },
      },
      source: { path: doc.rel, contentHash: sha16(doc.text), mtimeMs: doc.mtimeMs },
      warnings: ["PRODUCT.md parse incomplete — check source formatting"],
      uncertainty: "medium",
    };
  }

  return ok(
    {
      northStar: north.replace(/\n+/g, " "),
      invariant,
      stages,
      domainTerms: { contentUniverse: cuDef },
    },
    {
      source: { path: doc.rel, contentHash: sha16(doc.text), mtimeMs: doc.mtimeMs },
    }
  );
}
