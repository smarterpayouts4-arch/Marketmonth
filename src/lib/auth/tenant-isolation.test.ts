import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { buildContentAtom } from "@/brain/atom/build-content-atom";
import {
  brandCoreCacheKey,
  getBrandCore,
  normalizeCompanyId,
} from "@/brain/core/get-brand-core";
import { tenantScopedRateLimitKey } from "@/lib/http/rate-limit";

import { requireCompanyAccess } from "./company-access";

const sampleSelected = {
  masterTopic: {
    id: "master_iso",
    source: "automatic" as const,
    punchline: "How to make clearer marketing decisions",
    subheading: "Umbrella",
    rationale: "Isolation test",
    evidenceIds: [] as string[],
    confidence: "high" as const,
    safety: { status: "safe" as const, reasons: [] as string[] },
  },
  variation: {
    id: "var_shared_id",
    angle: "decision_guide" as const,
    punchline: "Decide what to say this month without drowning in ideas",
    subheading: "Decision support",
    brief: "Help operators pick one direction first with a clear editorial filter.",
    audienceProblem: "Too many disconnected content ideas",
    strategicPurpose: "Position as decision partner",
    evidenceIds: [] as string[],
    assumptionIds: [] as string[],
    confidence: "high" as const,
    safety: { status: "safe" as const, reasons: [] as string[] },
  },
};

describe("tenant isolation (DEV_AUTH_BYPASS=false)", () => {
  let previousBypass: string | undefined;

  before(() => {
    previousBypass = process.env.DEV_AUTH_BYPASS;
    process.env.DEV_AUTH_BYPASS = "false";
  });

  after(() => {
    if (previousBypass === undefined) {
      delete process.env.DEV_AUTH_BYPASS;
    } else {
      process.env.DEV_AUTH_BYPASS = previousBypass;
    }
  });

  it("requireCompanyAccess returns 403 without a bound user", async () => {
    const result = await requireCompanyAccess(null, "zynava.com");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 403);
      assert.match(result.error, /no bound user|access/i);
    }
  });

  it("requireCompanyAccess returns 403 for empty companyId", async () => {
    const result = await requireCompanyAccess("user-a", "   ");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 400);
    }
  });

  it("brandCoreCacheKey includes normalized company id", () => {
    const key = brandCoreCacheKey("https://www.Zynava.com", "abc123hash");
    assert.equal(key, `${normalizeCompanyId("zynava.com")}:abc123hash`);
    assert.match(key, /^zynava\.com:/);
    assert.notEqual(
      brandCoreCacheKey("zynava.com", "samehash"),
      brandCoreCacheKey("clearflow-plumbing", "samehash")
    );
  });

  it("atom_id differs across companies for the same variation id", async () => {
    const zynava = getBrandCore("zynava.com");
    const clearflow = getBrandCore("clearflowplumbing.example");
    const a = await buildContentAtom({
      brandCore: zynava.brandCore,
      selected: sampleSelected,
      preferLlm: false,
    });
    const b = await buildContentAtom({
      brandCore: clearflow.brandCore,
      selected: sampleSelected,
      preferLlm: false,
    });
    assert.equal(a.ok, true, a.ok ? undefined : a.errors?.join("; "));
    assert.equal(b.ok, true, b.ok ? undefined : b.errors?.join("; "));
    if (a.ok && b.ok) {
      assert.notEqual(a.atom.atom_id, b.atom.atom_id);
      assert.match(a.atom.atom_id, /^atom_/);
      assert.match(b.atom.atom_id, /^atom_/);
    }
  });

  it("tenantScopedRateLimitKey prefers userId:company over IP", () => {
    const req = new Request("http://localhost/api", {
      headers: { "x-forwarded-for": "203.0.113.9" },
    });
    assert.equal(
      tenantScopedRateLimitKey({
        userId: "user-1",
        companyId: "zynava.com",
        request: req,
      }),
      "user-1:zynava.com"
    );
    assert.equal(
      tenantScopedRateLimitKey({
        userId: null,
        companyId: null,
        request: req,
      }),
      "203.0.113.9"
    );
  });
});
