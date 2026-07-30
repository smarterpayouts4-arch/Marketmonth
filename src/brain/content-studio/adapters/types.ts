import type { ContentAtom } from "@/brain/atom";
import type { AtomValidationReport } from "@/brain/atom/validate/types";

import type { ContentFormatDefinition } from "../platform-registry";
import type {
  ContentFormatPackage,
  PackageStatus,
} from "../schemas/format-package";

export type FormatProductionInput = {
  atom: ContentAtom;
  validationReport: AtomValidationReport | null | undefined;
  atomRevision: number;
  buildKey: string;
  format: ContentFormatDefinition;
  priorPackage?: ContentFormatPackage;
  forceRegenerate?: boolean;
};

export type FormatValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export interface ContentFormatAdapter<T extends ContentFormatPackage> {
  formatId: T["formatId"];
  adapterVersion: string;
  templateVersion: string;
  canProduce(input: FormatProductionInput): boolean;
  produce(input: FormatProductionInput): Promise<T>;
  validate(output: T, input: FormatProductionInput): FormatValidationResult;
}

export function resolvePackageStatus(
  atom: ContentAtom,
  unresolvedResearch: string[]
): PackageStatus {
  if (atom.buildStatus === "invalid" || atom.buildStatus === "insufficient") {
    return "failed";
  }
  if (
    atom.buildStatus === "limited" ||
    unresolvedResearch.length > 0
  ) {
    return "research_required";
  }
  return "draft";
}

export function collectUnresolvedResearch(
  atom: ContentAtom,
  report?: AtomValidationReport | null
): string[] {
  const fromReport =
    report?.researchHandoff?.unresolvedQuestions ??
    report?.statusReasons
      ?.filter((r) =>
        /research|framework_promise|missing|depth/i.test(
          `${r.source} ${r.message}`
        )
      )
      .map((r) => r.message) ??
    [];
  return [
    ...new Set(
      [...atom.missing_information, ...fromReport]
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ].slice(0, 12);
}

export function evidenceRefsFromAtom(atom: ContentAtom): string[] {
  return [
    ...new Set([
      ...atom.kernel.supporting_proof.map((p) => p.proof_id),
      ...atom.claimLedger.claims.flatMap((c) => c.evidenceIds ?? []),
    ]),
  ];
}

export function buildIdempotencyKey(args: {
  atomId: string;
  atomRevision: number;
  formatId: string;
  adapterVersion: string;
  templateVersion: string;
}): string {
  return [
    args.atomId,
    args.atomRevision,
    args.formatId,
    args.adapterVersion,
    args.templateVersion,
  ].join("|");
}
