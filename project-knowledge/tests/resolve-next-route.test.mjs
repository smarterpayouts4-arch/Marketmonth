import assert from "node:assert/strict";
import { resolveNextRoute } from "../scripts/lib/resolve-next-route.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`ok — ${name}`);
  } catch (e) {
    console.error(`FAIL — ${name}`);
    throw e;
  }
}

test("root page", () => {
  assert.equal(resolveNextRoute("src/app/page.tsx"), "/");
});

test("route group omitted", () => {
  assert.equal(resolveNextRoute("src/app/(app)/brand/page.tsx"), "/brand");
  assert.equal(resolveNextRoute("src/app/(app)/strategy/page.tsx"), "/strategy");
});

test("nested under group", () => {
  assert.equal(resolveNextRoute("src/app/(app)/dashboard/page.tsx"), "/dashboard");
});

test("dynamic segment", () => {
  assert.equal(resolveNextRoute("src/app/(app)/posts/[id]/page.tsx"), "/posts/[id]");
});

test("catch-all", () => {
  assert.equal(resolveNextRoute("src/app/docs/[...slug]/page.tsx"), "/docs/[...slug]");
});

test("optional catch-all", () => {
  assert.equal(
    resolveNextRoute("src/app/shop/[[...slug]]/page.tsx"),
    "/shop/[[...slug]]"
  );
});

test("api route.ts", () => {
  assert.equal(
    resolveNextRoute("src/app/api/discovery/analyze/route.ts", { kind: "route" }),
    "/api/discovery/analyze"
  );
});

test("parallel @slot omitted", () => {
  assert.equal(
    resolveNextRoute("src/app/(app)/@modal/login/page.tsx"),
    "/login"
  );
});

test("non-page returns null", () => {
  assert.equal(resolveNextRoute("src/app/layout.tsx"), null);
});

console.log("resolve-next-route tests passed");
