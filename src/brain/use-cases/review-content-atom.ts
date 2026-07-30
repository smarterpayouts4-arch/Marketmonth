import type { ContentAtom } from "@/brain/atom";
import {
  createAtomRepository,
  type AtomApprovalAction,
  type LimitationsAcknowledgement,
  type StoredContentAtom,
} from "@/brain/store";

export type ReviewContentAtomInput = {
  atomId: string;
  companyId: string;
  action: AtomApprovalAction;
  expectedRevision?: number;
  note?: string;
  limitationsAcknowledgement?: LimitationsAcknowledgement;
};

export type ReviewContentAtomResult =
  | {
      ok: true;
      atom: ContentAtom;
      recordRevision: number;
      stored: StoredContentAtom;
    }
  | {
      ok: false;
      error: string;
      status: number;
    };

/**
 * Apply human review transition and persist the new atom version.
 * Approve also locks (specialist-ready).
 */
export async function reviewContentAtom(
  input: ReviewContentAtomInput
): Promise<ReviewContentAtomResult> {
  const atomId = input.atomId.trim();
  const companyId = input.companyId.trim();
  if (!atomId) {
    return { ok: false, error: "atomId is required", status: 400 };
  }
  if (!companyId) {
    return { ok: false, error: "companyId is required", status: 400 };
  }

  const repo = createAtomRepository();
  const current = await repo.getById(atomId, companyId);
  if (!current) {
    return { ok: false, error: "Atom not found", status: 404 };
  }

  const expectedRevision =
    input.expectedRevision ?? current.record_revision;

  try {
    const stored = await repo.updateApproval({
      atomId,
      companyId,
      action: input.action,
      expectedRevision,
      note: input.note,
      limitationsAcknowledgement: input.limitationsAcknowledgement,
    });
    return {
      ok: true,
      atom: stored.atom,
      recordRevision: stored.record_revision,
      stored,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Review failed";
    const status = /revision conflict/i.test(message) ? 409 : 422;
    return { ok: false, error: message, status };
  }
}
