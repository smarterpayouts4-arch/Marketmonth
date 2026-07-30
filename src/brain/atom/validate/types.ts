import type { AtomCraftReport } from "../craft-score";
import type { SpecialtyResearchHandoff } from "../research-handoff";
import type { BuildStatus, ContentAtom } from "../content-atom.schema";

export type AtomValidationViolation = {
  code: string;
  path: string;
  message: string;
  severity: "error" | "warning";
};

export type GateResult = {
  gateId: string;
  outcome: "pass" | "fail" | "warn" | "skip";
  severity: "error" | "warning" | "info";
  message: string;
  path?: string;
};

export type AtomStatusReason = {
  source: string;
  path?: string;
  ruleId?: string;
  message: string;
};

export type AtomValidationReport = {
  /** Alias for brief `valid`. */
  ok: boolean;
  valid: boolean;
  /** Alias for brief `resultingStatus`. */
  buildStatus: BuildStatus;
  resultingStatus: BuildStatus;
  violations: AtomValidationViolation[];
  gateResults: GateResult[];
  errors: AtomValidationViolation[];
  warnings: AtomValidationViolation[];
  repairableFields: string[];
  nonRepairableFailures: string[];
  /** Why status is not complete — includes silent demoters. */
  statusReasons: AtomStatusReason[];
  /** Hook + storytelling craft scores and field mapping (Inspector / review). */
  craftReport?: AtomCraftReport;
  /** Display-only research brief for limited/insufficient atoms. */
  researchHandoff?: SpecialtyResearchHandoff | null;
  atom: ContentAtom;
};
