import { and, desc, eq, ne, sql } from "drizzle-orm";

import {
  applyApprovalTransition,
  assertKernelImmutable,
  computeMessageHash,
  contentAtomSchema,
  lockAtom,
  type ContentAtom,
} from "@/brain/atom";
import { getDb } from "@/db";
import { contentAtoms } from "@/db/schema";

import type {
  AtomRepository,
  StoredContentAtom,
} from "./atom-repository";

type StoredEnvelope = {
  atom: ContentAtom;
  company_id: string;
  record_revision: number;
  created_at: string;
  updated_at: string;
  validation_report?: StoredContentAtom["validation_report"];
  build_key?: StoredContentAtom["build_key"];
  limitations_acknowledgement?: StoredContentAtom["limitations_acknowledgement"];
};

function normalizeCompanyId(companyId: string): string {
  return companyId.trim().toLowerCase();
}

function revisionConflictError(
  atomId: string,
  expected: number,
  actual?: number
): Error {
  return new Error(
    `Revision conflict for atom ${atomId}: expected ${expected}, got ${actual ?? "different revision"}`
  );
}

function rowToStored(row: {
  record: Record<string, unknown>;
}): StoredContentAtom {
  const envelope = row.record as StoredEnvelope;
  return {
    atom: contentAtomSchema.parse(envelope.atom),
    company_id: normalizeCompanyId(envelope.company_id),
    record_revision: envelope.record_revision,
    created_at: envelope.created_at,
    updated_at: envelope.updated_at,
    validation_report: envelope.validation_report ?? null,
    build_key: envelope.build_key ?? null,
    limitations_acknowledgement: envelope.limitations_acknowledgement ?? null,
  };
}

function toEnvelope(stored: StoredContentAtom): StoredEnvelope {
  return {
    atom: stored.atom,
    company_id: stored.company_id,
    record_revision: stored.record_revision,
    created_at: stored.created_at,
    updated_at: stored.updated_at,
    validation_report: stored.validation_report ?? null,
    build_key: stored.build_key ?? null,
    limitations_acknowledgement: stored.limitations_acknowledgement ?? null,
  };
}

function toStored(
  atom: ContentAtom,
  companyId: string,
  recordRevision: number,
  extras?: Partial<
    Pick<
      StoredContentAtom,
      "validation_report" | "build_key" | "limitations_acknowledgement"
    >
  >,
  createdAt?: string
): StoredContentAtom {
  const now = new Date().toISOString();
  return {
    atom: contentAtomSchema.parse(atom),
    company_id: companyId,
    record_revision: recordRevision,
    created_at: createdAt ?? now,
    updated_at: now,
    validation_report: extras?.validation_report ?? null,
    build_key: extras?.build_key ?? null,
    limitations_acknowledgement: extras?.limitations_acknowledgement ?? null,
  };
}

export function createDbAtomRepository(): AtomRepository {
  async function readLatest(
    atomId: string,
    companyId: string
  ): Promise<StoredContentAtom | null> {
    const db = getDb();
    const [row] = await db
      .select({ record: contentAtoms.record })
      .from(contentAtoms)
      .where(
        and(
          eq(contentAtoms.atomId, atomId),
          eq(contentAtoms.companyId, normalizeCompanyId(companyId))
        )
      )
      .orderBy(desc(contentAtoms.atomVersion))
      .limit(1);
    return row ? rowToStored(row) : null;
  }

  async function insertStored(stored: StoredContentAtom): Promise<void> {
    const db = getDb();
    await db.insert(contentAtoms).values({
      atomId: stored.atom.atom_id,
      atomVersion: stored.atom.atom_version,
      companyId: stored.company_id,
      approvalStatus: stored.atom.approvalStatus,
      buildStatus: stored.atom.buildStatus,
      recordRevision: stored.record_revision,
      record: toEnvelope(stored) as unknown as Record<string, unknown>,
      createdAt: new Date(stored.created_at),
      updatedAt: new Date(stored.updated_at),
    });
  }

  return {
    async save(atom, extras) {
      const parsed = contentAtomSchema.parse(atom);
      const companyId = normalizeCompanyId(parsed.lineage.companyId);
      const db = getDb();

      const [dup] = await db
        .select({ atomVersion: contentAtoms.atomVersion })
        .from(contentAtoms)
        .where(
          and(
            eq(contentAtoms.atomId, parsed.atom_id),
            eq(contentAtoms.atomVersion, parsed.atom_version)
          )
        )
        .limit(1);
      if (dup) {
        throw new Error(
          `ContentAtom version already exists: ${parsed.atom_id}@${parsed.atom_version}`
        );
      }

      const existing = await readLatest(parsed.atom_id, companyId);
      if (existing && normalizeCompanyId(existing.company_id) !== companyId) {
        throw new Error(
          `Atom ${parsed.atom_id} belongs to a different company`
        );
      }
      if (existing?.atom.approvalStatus === "locked") {
        const imm = assertKernelImmutable(existing.atom, parsed);
        if (!imm.ok) throw new Error(imm.error);
      }

      const stored = toStored(
        parsed,
        companyId,
        (existing?.record_revision ?? 0) + 1,
        {
          validation_report:
            extras?.validationReport ?? existing?.validation_report,
          build_key: extras?.buildKey ?? existing?.build_key,
          limitations_acknowledgement: existing?.limitations_acknowledgement,
        },
        existing?.created_at
      );

      await insertStored(stored);
      return stored;
    },

    async getById(atomId, companyId) {
      return readLatest(atomId, companyId);
    },

    async getLatest(atomId, companyId) {
      return readLatest(atomId, companyId);
    },

    async findLatestByAtomId(atomId) {
      const db = getDb();
      const [row] = await db
        .select({ record: contentAtoms.record })
        .from(contentAtoms)
        .where(eq(contentAtoms.atomId, atomId.trim()))
        .orderBy(desc(contentAtoms.atomVersion))
        .limit(1);
      return row ? rowToStored(row) : null;
    },

    async findUnlockedByBuildKey(buildKey, companyId) {
      const company = normalizeCompanyId(companyId);
      const db = getDb();
      const rows = await db
        .select({ record: contentAtoms.record, atomId: contentAtoms.atomId, atomVersion: contentAtoms.atomVersion })
        .from(contentAtoms)
        .where(
          and(
            eq(contentAtoms.companyId, company),
            sql`${contentAtoms.record}->>'build_key' = ${buildKey}`,
            ne(contentAtoms.approvalStatus, "locked")
          )
        )
        .orderBy(desc(contentAtoms.atomVersion));

      const latestByAtom = new Map<string, (typeof rows)[number]>();
      for (const row of rows) {
        const prev = latestByAtom.get(row.atomId);
        if (!prev || row.atomVersion > prev.atomVersion) {
          latestByAtom.set(row.atomId, row);
        }
      }
      const match = latestByAtom.values().next().value;
      return match ? rowToStored(match) : null;
    },

    async updateApproval(input) {
      const companyId = normalizeCompanyId(input.companyId);
      const current = await readLatest(input.atomId, companyId);
      if (!current) {
        throw new Error(`Unknown atom: ${input.atomId}`);
      }
      if (current.record_revision !== input.expectedRevision) {
        throw revisionConflictError(
          input.atomId,
          input.expectedRevision,
          current.record_revision
        );
      }

      if (input.action === "revise") {
        const noted: ContentAtom = {
          ...current.atom,
          atom_version: current.atom.atom_version + 1,
          missing_information: [
            ...current.atom.missing_information,
            input.note?.trim()
              ? `revise_requested: ${input.note.trim()}`
              : "revise_requested",
          ],
          approvalStatus: "changes_requested",
        };
        noted.message_hash = computeMessageHash(noted);
        const stored = toStored(
          noted,
          companyId,
          current.record_revision + 1,
          {
            validation_report: current.validation_report,
            build_key: current.build_key,
            limitations_acknowledgement: current.limitations_acknowledgement,
          },
          current.created_at
        );
        await insertStored(stored);
        return stored;
      }

      let transitioned = applyApprovalTransition(
        current.atom,
        input.action,
        input.note,
        {
          limitationsAcknowledgement: input.limitationsAcknowledgement,
          validationReport: current.validation_report ?? undefined,
        }
      );
      if (!transitioned.ok) {
        throw new Error(transitioned.error);
      }
      if (input.action === "approve") {
        const locked = lockAtom(transitioned.atom);
        if (!locked.ok) {
          throw new Error(locked.error);
        }
        transitioned = locked;
      }

      const stored = toStored(
        transitioned.atom,
        companyId,
        current.record_revision + 1,
        {
          validation_report: current.validation_report,
          build_key: current.build_key,
          limitations_acknowledgement:
            input.action === "approve"
              ? input.limitationsAcknowledgement ??
                current.limitations_acknowledgement
              : current.limitations_acknowledgement,
        },
        current.created_at
      );

      await insertStored(stored);
      return stored;
    },
  };
}
