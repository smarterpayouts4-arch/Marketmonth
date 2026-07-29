/**
 * Company profile artifact store.
 * Disk in development; DB text column when DATABASE_URL is set (serverless-safe).
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { artifactHashOfCsv } from "./csv-contract";

export type ArtifactState = "draft" | "approved";

function companySlug(companyId: string): string {
  return companyId
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/[^a-z0-9._-]+/g, "-");
}

/** Repo-relative artifact path — the only on-disk home for a company CSV. */
export function artifactRelativePath(
  companyId: string,
  state: ArtifactState
): string {
  return `data/companies/${companySlug(companyId)}/${state}.csv`;
}

export function artifactDiskPath(
  companyId: string,
  state: ArtifactState
): string {
  return path.join(process.cwd(), artifactRelativePath(companyId, state));
}

export function writeArtifact(
  companyId: string,
  state: ArtifactState,
  csvText: string
): { path: string; artifactHash: string; wroteDisk: boolean } {
  const filePath = artifactDiskPath(companyId, state);
  const artifactHash = artifactHashOfCsv(csvText);

  // Serverless filesystems are read-only; the DB mirror is the store there.
  let wroteDisk = false;
  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.${process.pid}.tmp`;
    writeFileSync(tmp, csvText, "utf8");
    renameSync(tmp, filePath);
    wroteDisk = true;
  } catch {
    wroteDisk = false;
  }

  void mirrorArtifactToDb(companyId, state, csvText, artifactHash).catch(
    () => undefined
  );

  return { path: filePath, artifactHash, wroteDisk };
}

/** Disk-only read. Use `readArtifactAsync` anywhere that runs in production. */
export function readArtifact(
  companyId: string,
  state: ArtifactState
): string | null {
  const filePath = artifactDiskPath(companyId, state);
  if (existsSync(filePath)) {
    return readFileSync(filePath, "utf8");
  }
  return null;
}

/**
 * Disk first, then the DB mirror. Serverless filesystems are read-only, so on
 * a deployed instance the mirror is the only copy that exists.
 */
export async function readArtifactAsync(
  companyId: string,
  state: ArtifactState
): Promise<string | null> {
  const fromDisk = readArtifact(companyId, state);
  if (fromDisk !== null) return fromDisk;
  return readArtifactFromDb(companyId, state);
}

async function readArtifactFromDb(
  companyId: string,
  state: ArtifactState
): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { getDb } = await import("@/db");
    const { companyProfileArtifacts } = await import("@/db/schema");
    const { eq, and } = await import("drizzle-orm");
    const db = getDb();
    const [row] = await db
      .select()
      .from(companyProfileArtifacts)
      .where(
        and(
          eq(companyProfileArtifacts.companyId, companySlug(companyId)),
          eq(companyProfileArtifacts.state, state)
        )
      )
      .limit(1);
    return row?.csvText ?? null;
  } catch {
    return null;
  }
}

async function mirrorArtifactToDb(
  companyId: string,
  state: ArtifactState,
  csvText: string,
  artifactHash: string
): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const { getDb } = await import("@/db");
    const { companyProfileArtifacts } = await import("@/db/schema");
    const { eq, and } = await import("drizzle-orm");
    const db = getDb();
    const slug = companySlug(companyId);
    const existing = await db
      .select()
      .from(companyProfileArtifacts)
      .where(
        and(
          eq(companyProfileArtifacts.companyId, slug),
          eq(companyProfileArtifacts.state, state)
        )
      )
      .limit(1);
    if (existing[0]) {
      await db
        .update(companyProfileArtifacts)
        .set({
          csvText,
          artifactHash,
          updatedAt: new Date(),
        })
        .where(eq(companyProfileArtifacts.id, existing[0].id));
    } else {
      await db.insert(companyProfileArtifacts).values({
        companyId: slug,
        state,
        csvText,
        artifactHash,
      });
    }
  } catch {
    // Table may not exist yet; disk remains SoT in dev.
  }
}
