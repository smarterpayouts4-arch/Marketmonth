import { spawnSync } from "node:child_process";
import path from "node:path";
import { NOT_EVALUATED, runNpm } from "./util.mjs";

export function runProbeChecks(root, byCheck, withProbes) {
  /** @type {Record<string, { status: string, detail?: string }>} */
  const probeStatus = {
    typecheck: { status: withProbes ? "pending" : "skipped" },
    lint: { status: withProbes ? "pending" : "skipped" },
    test: { status: withProbes ? "pending" : "skipped" },
  };

  if (!withProbes) {
    byCheck.typecheck_pass = [NOT_EVALUATED];
    byCheck.lint_pass = [NOT_EVALUATED];
    byCheck.test_suite_pass = [NOT_EVALUATED];
    return probeStatus;
  }

  function applyProbe(name, result) {
    const exitCode =
      result.error != null
        ? null
        : typeof result.status === "number"
          ? result.status
          : null;
    const failed =
      result.error != null ||
      exitCode === null ||
      (typeof exitCode === "number" && exitCode !== 0);
    if (failed) {
      byCheck[`${name}_pass`] = [
        `${name} failed (exit ${exitCode ?? "err"}${
          result.error ? `; spawn: ${result.error.message}` : ""
        })`,
      ];
      probeStatus[name] = {
        status: "fail",
        exitCode,
        error: result.error ? String(result.error.message) : null,
      };
    } else {
      byCheck[`${name}_pass`] = [];
      probeStatus[name] = { status: "pass", exitCode: 0, error: null };
    }
  }

  applyProbe("typecheck", runNpm(root, "typecheck", 240_000));
  applyProbe("lint", runNpm(root, "lint", 240_000));
  applyProbe("test", runNpm(root, "test", 240_000));
  // Map test_suite_pass (rubric check id) from test_pass
  byCheck.test_suite_pass = byCheck.test_pass;
  delete byCheck.test_pass;

  return probeStatus;
}

export function runRouteResolverTest(root) {
  const routeTest = spawnSync(
    process.execPath,
    [
      path.join(
        root,
        "project-knowledge",
        "tests",
        "resolve-next-route.test.mjs"
      ),
    ],
    { cwd: root, encoding: "utf8", timeout: 60_000 }
  );
  return routeTest.error ||
    (typeof routeTest.status === "number" && routeTest.status !== 0)
    ? [
        `resolve-next-route tests failed (exit ${routeTest.status ?? "err"})`,
      ]
    : [];
}
