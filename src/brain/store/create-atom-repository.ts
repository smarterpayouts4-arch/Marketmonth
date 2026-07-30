import { classifyPgError } from "@/db/pg-errors";

import type { AtomRepository } from "./atom-repository";
import { createDbAtomRepository } from "./db-atom-repository";
import { createJsonAtomRepository } from "./json-atom-repository";

/**
 * Sole factory for the Content Atom store.
 * - `DATABASE_URL` set → Drizzle/Neon `content_atoms`, with JSON fallback
 *   when the table is missing (unapplied migrations).
 * - otherwise (local dev) → JSON under `data/runtime/atoms/`
 */
export function createAtomRepository(): AtomRepository {
  if (process.env.DATABASE_URL?.trim()) {
    return withMissingTableFallback(createDbAtomRepository());
  }
  return createJsonAtomRepository();
}

function withMissingTableFallback(primary: AtomRepository): AtomRepository {
  let active: AtomRepository = primary;
  let fellBack = false;

  const ensureFallback = (err: unknown): AtomRepository => {
    const classified = classifyPgError(err);
    if (classified.reason !== "missing_table") throw err;
    if (!fellBack) {
      fellBack = true;
      console.warn(
        `[atom-store] content_atoms missing (${classified.code ?? "42P01"}); falling back to JSON store under data/runtime/atoms/`
      );
      active = createJsonAtomRepository();
    }
    return active;
  };

  return {
    async save(atom, extras) {
      try {
        return await active.save(atom, extras);
      } catch (err) {
        return ensureFallback(err).save(atom, extras);
      }
    },
    async getById(atomId, companyId) {
      try {
        return await active.getById(atomId, companyId);
      } catch (err) {
        return ensureFallback(err).getById(atomId, companyId);
      }
    },
    async getLatest(atomId, companyId) {
      try {
        return await active.getLatest(atomId, companyId);
      } catch (err) {
        return ensureFallback(err).getLatest(atomId, companyId);
      }
    },
    async findLatestByAtomId(atomId) {
      try {
        return await active.findLatestByAtomId(atomId);
      } catch (err) {
        return ensureFallback(err).findLatestByAtomId(atomId);
      }
    },
    async findUnlockedByBuildKey(buildKey, companyId) {
      try {
        return await active.findUnlockedByBuildKey(buildKey, companyId);
      } catch (err) {
        return ensureFallback(err).findUnlockedByBuildKey(buildKey, companyId);
      }
    },
    async updateApproval(input) {
      try {
        return await active.updateApproval(input);
      } catch (err) {
        return ensureFallback(err).updateApproval(input);
      }
    },
  };
}

/** Test helper — missing-table wrap without requiring DATABASE_URL. */
export const __createAtomRepositoryTestables = {
  withMissingTableFallback,
  classifyPgError,
};
