import type {
  ApprovalTransition,
  ContentAtom,
  LimitationsAcknowledgement,
} from "@/brain/atom";
import type { AtomValidationReport } from "@/brain/atom/validate/types";

export type { LimitationsAcknowledgement };

/**
 * Durable Content Atom store — callers use this port, never parse JSON/DB rows.
 * Composite identity: (atom_id, atom_version). Optimistic concurrency via
 * record_revision on the stored envelope.
 */

export type StoredContentAtom = {
  atom: ContentAtom;
  company_id: string;
  record_revision: number;
  created_at: string;
  updated_at: string;
  /** Brief section 8 report — persisted with the atom. */
  validation_report?: AtomValidationReport | null;
  /** Idempotency key for draft reuse. */
  build_key?: string | null;
  /** Required when approving a limited atom. */
  limitations_acknowledgement?: LimitationsAcknowledgement | null;
};

export type AtomApprovalAction =
  | Extract<ApprovalTransition, "approve" | "request_changes" | "reject">
  | "revise";

export type AtomRepository = {
  /** Persist a new atom version row (insert; does not overwrite prior versions). */
  save(
    atom: ContentAtom,
    extras?: {
      validationReport?: AtomValidationReport | null;
      buildKey?: string | null;
    }
  ): Promise<StoredContentAtom>;

  /** Latest version for atomId scoped to companyId, or null. */
  getById(
    atomId: string,
    companyId: string
  ): Promise<StoredContentAtom | null>;

  /** Alias of getById — latest version for the atom under the company. */
  getLatest(
    atomId: string,
    companyId: string
  ): Promise<StoredContentAtom | null>;

  /**
   * Latest version by atomId alone (owner company comes from the stored row).
   * Used for deep-link auth: load → requireCompanyAccess(stored.company_id).
   */
  findLatestByAtomId(atomId: string): Promise<StoredContentAtom | null>;

  /** Find an unlocked draft by AtomBuildKey for idempotent rebuilds. */
  findUnlockedByBuildKey(
    buildKey: string,
    companyId: string
  ): Promise<StoredContentAtom | null>;

  /**
   * Apply approval transition with optimistic concurrency.
   * `approve` also locks so specialists can consume the atom.
   */
  updateApproval(input: {
    atomId: string;
    companyId: string;
    action: AtomApprovalAction;
    expectedRevision: number;
    note?: string;
    limitationsAcknowledgement?: LimitationsAcknowledgement;
  }): Promise<StoredContentAtom>;
};
