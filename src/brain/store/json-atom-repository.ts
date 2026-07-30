import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import {
  applyApprovalTransition,
  assertKernelImmutable,
  contentAtomSchema,
  lockAtom,
  type ContentAtom,
} from "@/brain/atom";

import type {
  AtomRepository,
  StoredContentAtom,
} from "./atom-repository";
import { readJsonFile } from "./json-store";
import { runtimeRoot } from "./paths";
import { withWriteLock } from "./write-lock";

type AtomFileEnvelope = {
  kind: "content-atom-store";
  company_id: string;
  versions: StoredContentAtom[];
};

function atomsDir(): string {
  return path.join(runtimeRoot(), "atoms");
}

function atomFilePath(atomId: string): string {
  const safe = atomId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return path.join(atomsDir(), `${safe}.json`);
}

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

function latestOf(versions: StoredContentAtom[]): StoredContentAtom | null {
  if (versions.length === 0) return null;
  return versions.reduce((best, row) =>
    row.atom.atom_version > best.atom.atom_version ? row : best
  );
}

function replaceAtomic(tmp: string, filePath: string): void {
  try {
    renameSync(tmp, filePath);
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code !== "EPERM" && code !== "EEXIST") throw err;
    if (existsSync(filePath)) unlinkSync(filePath);
    renameSync(tmp, filePath);
  }
}

function writeEnvelopeSync(atomId: string, envelope: AtomFileEnvelope): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("brain/store JSON runtime is production-impossible");
  }
  const filePath = atomFilePath(atomId);
  mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");
  replaceAtomic(tmp, filePath);
}

export function createJsonAtomRepository(): AtomRepository {
  function readEnvelope(atomId: string): AtomFileEnvelope | null {
    return readJsonFile<AtomFileEnvelope>(atomFilePath(atomId));
  }

  async function getLatestStored(
    atomId: string,
    companyId: string
  ): Promise<StoredContentAtom | null> {
    const envelope = readEnvelope(atomId);
    if (!envelope) return null;
    if (normalizeCompanyId(envelope.company_id) !== normalizeCompanyId(companyId)) {
      return null;
    }
    return latestOf(envelope.versions);
  }

  return {
    async save(atom, extras) {
      const parsed = contentAtomSchema.parse(atom);
      const companyId = normalizeCompanyId(parsed.lineage.companyId);
      return withWriteLock(async () => {
        const existing = readEnvelope(parsed.atom_id);
        if (existing) {
          const dup = existing.versions.find(
            (v) => v.atom.atom_version === parsed.atom_version
          );
          if (dup) {
            throw new Error(
              `ContentAtom version already exists: ${parsed.atom_id}@${parsed.atom_version}`
            );
          }
          if (normalizeCompanyId(existing.company_id) !== companyId) {
            throw new Error(
              `Atom ${parsed.atom_id} belongs to a different company`
            );
          }
          const prev = latestOf(existing.versions);
          if (prev?.atom.approvalStatus === "locked") {
            const imm = assertKernelImmutable(prev.atom, parsed);
            if (!imm.ok) throw new Error(imm.error);
          }
          const stored = toStored(
            parsed,
            companyId,
            (prev?.record_revision ?? 0) + 1,
            {
              validation_report: extras?.validationReport ?? prev?.validation_report,
              build_key: extras?.buildKey ?? prev?.build_key,
              limitations_acknowledgement: prev?.limitations_acknowledgement,
            },
            prev?.created_at
          );
          writeEnvelopeSync(parsed.atom_id, {
            kind: "content-atom-store",
            company_id: companyId,
            versions: [...existing.versions, stored],
          });
          return stored;
        }

        const stored = toStored(parsed, companyId, 1, {
          validation_report: extras?.validationReport,
          build_key: extras?.buildKey,
        });
        writeEnvelopeSync(parsed.atom_id, {
          kind: "content-atom-store",
          company_id: companyId,
          versions: [stored],
        });
        return stored;
      });
    },

    async getById(atomId, companyId) {
      return getLatestStored(atomId, companyId);
    },

    async getLatest(atomId, companyId) {
      return getLatestStored(atomId, companyId);
    },

    async findLatestByAtomId(atomId) {
      const envelope = readEnvelope(atomId.trim());
      if (!envelope) return null;
      return latestOf(envelope.versions);
    },

    async findUnlockedByBuildKey(buildKey, companyId) {
      const dir = atomsDir();
      if (!existsSync(dir)) return null;
      const want = normalizeCompanyId(companyId);
      for (const name of readdirSync(dir)) {
        if (!name.endsWith(".json")) continue;
        const envelope = readJsonFile<AtomFileEnvelope>(path.join(dir, name));
        if (!envelope) continue;
        if (normalizeCompanyId(envelope.company_id) !== want) continue;
        const latest = latestOf(envelope.versions);
        if (!latest) continue;
        if (latest.build_key !== buildKey) continue;
        if (latest.atom.approvalStatus === "locked") continue;
        return latest;
      }
      return null;
    },

    async updateApproval(input) {
      return withWriteLock(async () => {
        const companyId = normalizeCompanyId(input.companyId);
        const envelope = readEnvelope(input.atomId);
        if (!envelope || normalizeCompanyId(envelope.company_id) !== companyId) {
          throw new Error(`Unknown atom: ${input.atomId}`);
        }
        const current = latestOf(envelope.versions);
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
          // Revision is handled at the use-case layer (rebuild). Persist note only.
          const noted = {
            ...current.atom,
            missing_information: [
              ...current.atom.missing_information,
              input.note?.trim()
                ? `revise_requested: ${input.note.trim()}`
                : "revise_requested",
            ],
            approvalStatus: "changes_requested" as const,
          };
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
          writeEnvelopeSync(input.atomId, {
            kind: "content-atom-store",
            company_id: companyId,
            versions: [...envelope.versions, stored],
          });
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
        writeEnvelopeSync(input.atomId, {
          kind: "content-atom-store",
          company_id: companyId,
          versions: [...envelope.versions, stored],
        });
        return stored;
      });
    },
  };
}
