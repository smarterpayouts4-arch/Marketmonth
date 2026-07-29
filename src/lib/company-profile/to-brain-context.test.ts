import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { parseCompanyCsv } from "./csv-contract";
import { projectionToBrainContext } from "./to-brain-context";
import type { CompanyProfileProjection } from "./projection.schema";

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
const PHONE_RE = /(?:\(\d{3}\)|\b\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/;

async function loadProjection(
  companyId: string
): Promise<CompanyProfileProjection> {
  const csvPath = path.join(
    process.cwd(),
    "data",
    "companies",
    companyId,
    "approved.csv"
  );
  return parseCompanyCsv(await readFile(csvPath, "utf8"));
}

/** Every string the brain can read, flattened for scanning. */
function readableStrings(
  context: ReturnType<typeof projectionToBrainContext>
): string[] {
  return [
    context.description ?? "",
    context.audience ?? "",
    context.valueProposition ?? "",
    context.brandVoice ?? "",
    context.marketingOpportunity ?? "",
    ...context.products,
    ...context.services,
    ...context.contentOpportunities,
    ...(context.faqs ?? []).flatMap((f) => [f.question, f.answer]),
    ...(context.commercialTerms ?? []).map((t) => t.label),
    ...(context.signals?.headings ?? []),
    ...(context.signals?.ctaTexts ?? []),
    context.signals?.productText ?? "",
    context.signals?.aboutText ?? "",
    context.signals?.bodySample ?? "",
    context.signals?.testimonialText ?? "",
    ...Object.values(context.evidenceById).flatMap((ev) => [
      ev.value,
      ev.sourceSnippet,
    ]),
  ];
}

describe("projectionToBrainContext", () => {
  it("populates evidenceType so observed and inferred can be told apart", async () => {
    const context = projectionToBrainContext(await loadProjection("zynava.com"));
    const rows = Object.values(context.evidenceById);
    assert.ok(rows.length > 0, "no evidence reached the brain");
    assert.ok(
      rows.every((ev) => Boolean(ev.evidenceType)),
      "at least one row lost its evidence type"
    );
  });

  it("carries FAQs, commercial terms, and raw signals", async () => {
    const context = projectionToBrainContext(await loadProjection("zynava.com"));
    assert.ok((context.faqs?.length ?? 0) > 0, "FAQs dropped");
    assert.ok(
      (context.signals?.ctaTexts.length ?? 0) > 0,
      "CTA texts dropped — Offers & Conversion depends on these"
    );
    assert.ok(
      (context.signals?.productText.length ?? 0) > 0,
      "productText dropped"
    );
  });

  /**
   * Contact details must not reach a model prompt. Dropping the contactEmails
   * and contactPhones arrays is not enough on its own: `aboutText` is assembled
   * from whole page bodies, and there are dedicated `contactEmail` evidence
   * rows, so both redaction and field exclusion are required.
   */
  it("never exposes contact details to the brain", async () => {
    for (const companyId of ["zynava.com", "clearflow-plumbing"]) {
      const context = projectionToBrainContext(await loadProjection(companyId));
      for (const value of readableStrings(context)) {
        assert.equal(
          EMAIL_RE.test(value),
          false,
          `${companyId} leaked an email: ${value.slice(0, 120)}`
        );
        assert.equal(
          PHONE_RE.test(value),
          false,
          `${companyId} leaked a phone number: ${value.slice(0, 120)}`
        );
      }
      for (const field of Object.values(context.evidenceById).map(
        (ev) => ev.field
      )) {
        assert.equal(
          /^(?:contact)?(?:email|phone|tel)$/i.test(field),
          false,
          `${companyId} kept a contact-only evidence field: ${field}`
        );
      }
    }
  });

  /**
   * ZYNAVA's ingredient→benefit copy arrives camel-glued in `productText`
   * ("Vitamin DThe Sunshine Vitamin..."). The structured `productsServices`
   * evidence row is clipped and holds fewer pairs, so the signals passthrough
   * is what makes the full set reachable. Mineral pairs live only there.
   */
  it("reaches ingredient copy that the clipped evidence row omits", async () => {
    const context = projectionToBrainContext(await loadProjection("zynava.com"));
    const productText = context.signals?.productText ?? "";
    for (const mineral of ["Magnesium", "Zinc", "Calcium"]) {
      assert.ok(
        productText.includes(mineral),
        `${mineral} unreachable — outcome topics would be limited to vitamins`
      );
    }
  });

  it("degrades to empty rather than inventing signals", async () => {
    const context = projectionToBrainContext(
      await loadProjection("clearflow-plumbing")
    );
    assert.deepEqual(context.faqs, []);
    assert.deepEqual(context.commercialTerms, []);
    assert.equal(context.signals?.productText, "");
    assert.deepEqual(context.signals?.ctaTexts, []);
  });
});
