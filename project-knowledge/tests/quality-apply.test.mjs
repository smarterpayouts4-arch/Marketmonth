/**
 * Proves failure modes cannot produce a perfect Internal Engineering Quality Score.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyRubric } from "../scripts/lib/quality-score/apply.mjs";
import { NOT_EVALUATED } from "../scripts/lib/quality-collect/util.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rules = JSON.parse(
  fs.readFileSync(
    path.join(root, "project-knowledge", "quality-rules.json"),
    "utf8"
  )
);

function emptyByCheck() {
  const byCheck = {};
  for (const r of rules.rules) byCheck[r.check] = [];
  return byCheck;
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok — ${name}`);
  } catch (e) {
    console.error(`FAIL — ${name}`);
    throw e;
  }
}

test("full evaluated pass can be perfect-eligible", () => {
  const evidence = {
    byCheck: emptyByCheck(),
    withProbes: true,
    stats: { guardianHard: 0 },
  };
  const s = applyRubric(rules, evidence);
  assert.equal(s.totalPoints, 100);
  assert.equal(s.scoreOutOf10, 10);
  assert.equal(s.perfectEligible, true);
  assert.equal(s.evaluationsComplete, true);
});

test("typecheck NOT_EVALUATED blocks perfect score", () => {
  const byCheck = emptyByCheck();
  byCheck.typecheck_pass = [NOT_EVALUATED];
  const s = applyRubric(rules, {
    byCheck,
    withProbes: false,
    stats: { guardianHard: 0 },
  });
  assert.ok(s.scoreOutOf10 < 10);
  assert.equal(s.perfectEligible, false);
  assert.ok(s.notEvaluatedRules.includes("PK-QUALITY-033"));
});

test("lint NOT_EVALUATED blocks perfect score", () => {
  const byCheck = emptyByCheck();
  byCheck.lint_pass = [NOT_EVALUATED];
  const s = applyRubric(rules, {
    byCheck,
    withProbes: true,
    stats: { guardianHard: 0 },
  });
  assert.ok(s.scoreOutOf10 < 10);
  assert.equal(s.perfectEligible, false);
});

test("failed tests deduct and block perfect score", () => {
  const byCheck = emptyByCheck();
  byCheck.test_suite_pass = ["npm test failed (exit 1)"];
  const s = applyRubric(rules, {
    byCheck,
    withProbes: true,
    stats: { guardianHard: 0 },
  });
  assert.ok(s.totalPoints < 100);
  assert.ok(s.scoreOutOf10 < 10);
  assert.equal(s.perfectEligible, false);
});

test("missing required check key is NOT_EVALUATED not silent pass", () => {
  const byCheck = emptyByCheck();
  delete byCheck.typecheck_pass;
  const s = applyRubric(rules, {
    byCheck,
    withProbes: true,
    stats: { guardianHard: 0 },
  });
  assert.ok(s.notEvaluatedRules.includes("PK-QUALITY-033"));
  assert.equal(s.perfectEligible, false);
  assert.ok(s.scoreOutOf10 < 10);
});

test("hard guardian failures block perfect eligibility even at full points", () => {
  const s = applyRubric(rules, {
    byCheck: emptyByCheck(),
    withProbes: true,
    stats: { guardianHard: 2 },
  });
  // No mapped deductions if hard codes aren't in byCheck findings — still not perfectEligible
  assert.equal(s.totalPoints, 100);
  assert.equal(s.perfectEligible, false);
  assert.ok(s.scoreOutOf10 < 10);
});

test("category with not-evaluated checks cannot claim perfect category silently", () => {
  const byCheck = emptyByCheck();
  byCheck.stale_generated_maps = [NOT_EVALUATED];
  const s = applyRubric(rules, {
    byCheck,
    withProbes: true,
    stats: { guardianHard: 0 },
  });
  const docs = s.categories.find((c) => c.id === "documentation");
  assert.ok(docs.notEvaluated.length > 0);
  assert.ok(docs.points < docs.maxPoints);
});

test("AI fields are irrelevant to applyRubric (deterministic independence)", () => {
  const evidence = {
    byCheck: emptyByCheck(),
    withProbes: true,
    stats: { guardianHard: 0 },
    aiReview: { observations: ["should not matter"] },
  };
  const a = applyRubric(rules, evidence);
  const b = applyRubric(rules, {
    byCheck: emptyByCheck(),
    withProbes: true,
    stats: { guardianHard: 0 },
  });
  assert.equal(a.totalPoints, b.totalPoints);
  assert.equal(a.scoreOutOf10, b.scoreOutOf10);
});

test("unowned paths deduct ownership points", () => {
  const byCheck = emptyByCheck();
  byCheck.unowned_src_paths = ["src/a.ts", "src/b.ts"];
  const s = applyRubric(rules, {
    byCheck,
    withProbes: true,
    stats: { guardianHard: 0 },
  });
  assert.ok(s.totalPoints < 100);
  const own = s.categories.find((c) => c.id === "ownership");
  assert.ok(own.points < own.maxPoints);
});

console.log("quality-apply tests passed");
