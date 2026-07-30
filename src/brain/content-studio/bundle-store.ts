import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

import { readJsonFile, writeJsonAtomic } from "@/brain/store/json-store";
import { runtimeRoot } from "@/brain/store/paths";

import {
  contentProductionBundleSchema,
  type ContentProductionBundle,
} from "./schemas/format-package";

function bundlesDir(): string {
  return path.join(runtimeRoot(), "production-bundles");
}

function bundleFilePath(atomId: string, atomRevision: number): string {
  const safe = atomId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  return path.join(bundlesDir(), `${safe}_r${atomRevision}.json`);
}

export async function saveProductionBundle(
  bundle: ContentProductionBundle
): Promise<void> {
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
    // Still allow JSON in non-DB prod? Prefer write for now under runtime.
  }
  const parsed = contentProductionBundleSchema.parse(bundle);
  mkdirSync(bundlesDir(), { recursive: true });
  await writeJsonAtomic(bundleFilePath(parsed.atomId, parsed.atomRevision), {
    kind: "content-production-bundle",
    ...parsed,
  });
}

export function loadProductionBundle(
  atomId: string,
  atomRevision: number
): ContentProductionBundle | null {
  const row = readJsonFile<ContentProductionBundle & { kind?: string }>(
    bundleFilePath(atomId, atomRevision)
  );
  if (!row) return null;
  const parsed = contentProductionBundleSchema.safeParse(row);
  return parsed.success ? parsed.data : null;
}

/** Latest bundle for atomId by highest revision filename. */
export function loadLatestProductionBundle(
  atomId: string
): ContentProductionBundle | null {
  const dir = bundlesDir();
  if (!existsSync(dir)) return null;
  const safe = atomId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const prefix = `${safe}_r`;
  let best: ContentProductionBundle | null = null;
  let bestRev = -1;
  for (const name of readdirSync(dir)) {
    if (!name.startsWith(prefix) || !name.endsWith(".json")) continue;
    const rev = Number(name.slice(prefix.length, -".json".length));
    if (!Number.isFinite(rev)) continue;
    const loaded = loadProductionBundle(atomId, rev);
    if (loaded && rev > bestRev) {
      best = loaded;
      bestRev = rev;
    }
  }
  return best;
}
