import fs from "node:fs";
import { relPosix } from "../scan/fs.mjs";
import { collectImportSpecs, layersForImports } from "./imports.mjs";
import { FEATURE_DIRS, countLines, featureOf } from "./util.mjs";

export function scanSrcFindings(root, srcFiles, thresholds) {
  const lineLimit = thresholds.oversizedFileLines ?? 500;
  const exportLimit = thresholds.excessiveExports ?? 25;
  const mixedLayerMin = thresholds.mixedLayerMin ?? 3;

  const oversized = [];
  const extreme = [];
  const excessiveExports = [];
  const mixedResponsibilities = [];
  const uiDb = [];
  const deepCrossFeature = [];
  const clientServer = [];

  for (const abs of srcFiles) {
    const rel = relPosix(root, abs);
    if (/\.(test|spec)\./.test(rel)) continue;
    const text = fs.readFileSync(abs, "utf8");
    const lines = countLines(text);
    if (lines > lineLimit)
      oversized.push(`${rel} (${lines} lines > ${lineLimit})`);
    if (lines > lineLimit * 2)
      extreme.push(`${rel} (${lines} lines > ${lineLimit * 2})`);

    const exportCount = (text.match(/^export\s/gm) || []).length;
    if (exportCount > exportLimit) {
      excessiveExports.push(
        `${rel} (${exportCount} export decls > ${exportLimit})`
      );
    }

    const specs = collectImportSpecs(text);
    const layers = layersForImports(specs);
    if (layers.length >= mixedLayerMin) {
      mixedResponsibilities.push(
        `${rel} layers=[${layers.join(",")}] (min ${mixedLayerMin})`
      );
    }

    if (
      rel.startsWith("src/components/") &&
      (specs.some((s) => s.startsWith("@/db") || s.startsWith("drizzle-orm")) ||
        /from\s+["']@\/db/.test(text))
    ) {
      uiDb.push(`${rel} imports db/infrastructure`);
    }

    if (text.includes("'use client'") || text.includes('"use client"')) {
      if (
        specs.some(
          (s) =>
            s === "next/server" ||
            s === "server-only" ||
            s.startsWith("@/db") ||
            s.startsWith("drizzle-orm")
        )
      ) {
        clientServer.push(`${rel} client file imports server-only module`);
      }
    }

    const fromFeat = featureOf(rel);
    if (fromFeat) {
      for (const spec of specs) {
        const m = spec.match(/^@\/components\/([^/]+)(?:\/(.+))?$/);
        if (!m) continue;
        const toFeat = m[1];
        const rest = m[2] || "";
        if (!FEATURE_DIRS.has(toFeat) || toFeat === fromFeat) continue;
        const isPublic =
          !rest ||
          rest === "index" ||
          rest === "index.ts" ||
          rest === "index.tsx";
        if (!isPublic) {
          deepCrossFeature.push(
            `${rel} → ${spec} (bypass ${toFeat} public API)`
          );
        }
      }
    }
  }

  return {
    oversized,
    extreme,
    excessiveExports,
    mixedResponsibilities,
    uiDb,
    deepCrossFeature,
    clientServer,
  };
}
