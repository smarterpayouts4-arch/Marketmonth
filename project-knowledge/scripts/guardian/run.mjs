import { loadOwnershipRules, repoRoot } from "../lib/scan.mjs";
import { checkApsProductStub, checkManifestDuplicates, checkProductAuthority } from "./hard.mjs";
import { checkDependencyRules } from "./imports.mjs";
import { checkFreshnessPilot } from "./freshness-pilot.mjs";
import {
  checkExpiredExceptions,
  checkFeatureDocs,
  checkUnownedPaths,
} from "./soft.mjs";

/**
 * @returns {{ hard: Array<{code:string,message:string}>, soft: Array<{code:string,message:string}> }}
 */
export function runGuardian(root = repoRoot()) {
  const hard = [];
  const soft = [];
  const rules = loadOwnershipRules(root);
  const today = new Date().toISOString().slice(0, 10);

  function fail(code, message) {
    hard.push({ code, message });
  }
  function warn(code, message) {
    soft.push({ code, message });
  }

  const emit = { fail, warn };

  checkProductAuthority(root, emit);
  checkApsProductStub(root, emit);
  checkManifestDuplicates(root, emit);
  checkUnownedPaths(root, emit);
  checkFeatureDocs(root, rules.qualifyingFeatureRoots, emit);
  checkExpiredExceptions(rules.exceptions, today, emit);
  checkDependencyRules(root, rules.dependencyRules, emit);
  checkFreshnessPilot(root, emit);

  return { hard, soft };
}
