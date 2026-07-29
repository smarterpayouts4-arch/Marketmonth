import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { appMetadata } from "@/db/schema";

import {
  MARKETMONTH_APPLICATION_ID,
  MARKETMONTH_DB_MARKER_DEV,
  MARKETMONTH_DB_MARKER_ENV,
  MARKETMONTH_SCHEMA_VERSION,
  type MarketMonthEnvironment,
} from "./constants";

export type DbSafetyMode = "migrate" | "seed" | "publish" | "reset" | "runtime";

function redactDatabaseUrl(url: string): { host: string; database: string } {
  try {
    const u = new URL(url);
    const database = u.pathname.replace(/^\//, "").split("?")[0] || "(unknown)";
    return { host: u.hostname || "(unknown)", database };
  } catch {
    return { host: "(unparseable)", database: "(unparseable)" };
  }
}

/** Detect duplicate DATABASE_URL= keys in dotenv files (fail closed). */
export function assertNoDuplicateDatabaseUrlKeys(
  cwd = process.cwd()
): void {
  for (const name of [".env.local", ".env"]) {
    const path = join(cwd, name);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    const matches = text.match(/^DATABASE_URL=/gm);
    if (matches && matches.length > 1) {
      throw new Error(
        `Duplicate DATABASE_URL= keys in ${name} (${matches.length}). Keep exactly one.`
      );
    }
  }
}

export function assertEnvDbMarker(): {
  marker: string;
  host: string;
  database: string;
} {
  assertNoDuplicateDatabaseUrlKeys();

  const marker = process.env[MARKETMONTH_DB_MARKER_ENV]?.trim();
  if (!marker) {
    throw new Error(
      `${MARKETMONTH_DB_MARKER_ENV} is required. Set ${MARKETMONTH_DB_MARKER_ENV}=${MARKETMONTH_DB_MARKER_DEV} for dedicated MarketMonth Neon.`
    );
  }
  if (marker !== MARKETMONTH_DB_MARKER_DEV && process.env.NODE_ENV !== "test") {
    // Allow non-dev markers only when explicitly set for other envs later.
    if (!marker.startsWith("marketmonth-")) {
      throw new Error(
        `${MARKETMONTH_DB_MARKER_ENV} must start with "marketmonth-" (got "${marker}").`
      );
    }
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required for MarketMonth database operations.");
  }

  const { host, database } = redactDatabaseUrl(url);
  console.info(
    `[db-safety] marker=${marker} host=${host} database=${database}`
  );
  return { marker, host, database };
}

/**
 * Verify env marker + resident app_metadata row.
 * For migrate/bootstrap, pass `allowMissingMetadata` once to seed the row.
 */
export async function assertMarketMonthDatabase(options: {
  mode: DbSafetyMode;
  expectedEnvironment?: MarketMonthEnvironment;
  /** First migrate may create app_metadata when absent. */
  allowMissingMetadata?: boolean;
}): Promise<void> {
  const { marker } = assertEnvDbMarker();
  const expectedEnv = options.expectedEnvironment ?? "development";

  if (options.mode === "migrate" && options.allowMissingMetadata) {
    return;
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(appMetadata)
    .where(eq(appMetadata.applicationId, MARKETMONTH_APPLICATION_ID))
    .limit(1);

  if (!row) {
    throw new Error(
      `app_metadata missing for applicationId="${MARKETMONTH_APPLICATION_ID}". Run db:migrate / seed:marketmonth-db on a dedicated Neon.`
    );
  }

  if (row.environment !== expectedEnv && options.mode !== "runtime") {
    throw new Error(
      `app_metadata.environment="${row.environment}" !== expected "${expectedEnv}".`
    );
  }

  if (row.schemaVersion < 1) {
    throw new Error(`app_metadata.schemaVersion invalid: ${row.schemaVersion}`);
  }

  // Env marker must align with development metadata for local ops.
  if (
    expectedEnv === "development" &&
    marker !== MARKETMONTH_DB_MARKER_DEV &&
    options.mode !== "runtime"
  ) {
    throw new Error(
      `Env marker "${marker}" inconsistent with development app_metadata (want ${MARKETMONTH_DB_MARKER_DEV}).`
    );
  }

  if (
    options.mode !== "migrate" &&
    row.schemaVersion < MARKETMONTH_SCHEMA_VERSION
  ) {
    console.warn(
      `[db-safety] schemaVersion=${row.schemaVersion} < code ${MARKETMONTH_SCHEMA_VERSION}; run migrations.`
    );
  }
}

/** Insert or update the resident application marker after successful migrate. */
export async function upsertAppMetadata(input?: {
  environment?: MarketMonthEnvironment;
  schemaVersion?: number;
}): Promise<void> {
  assertEnvDbMarker();
  const db = getDb();
  const environment = input?.environment ?? "development";
  const schemaVersion = input?.schemaVersion ?? MARKETMONTH_SCHEMA_VERSION;
  const now = new Date();

  const [existing] = await db
    .select()
    .from(appMetadata)
    .where(eq(appMetadata.applicationId, MARKETMONTH_APPLICATION_ID))
    .limit(1);

  if (existing) {
    await db
      .update(appMetadata)
      .set({ environment, schemaVersion, updatedAt: now })
      .where(eq(appMetadata.applicationId, MARKETMONTH_APPLICATION_ID));
    return;
  }

  await db.insert(appMetadata).values({
    applicationId: MARKETMONTH_APPLICATION_ID,
    environment,
    schemaVersion,
    createdAt: now,
    updatedAt: now,
  });
}
