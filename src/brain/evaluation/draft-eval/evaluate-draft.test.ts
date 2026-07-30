import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ContentAtom } from "@/brain/atom";
import type { ContentBrainContext } from "@/brain/content/types";

import {
  evaluateDraft,
  evaluateWithBoundedRevision,
  MAX_DRAFT_REVISIONS,
} from "./evaluate-draft";

function atom(partial: {
  masterTitle: string;
  audience_state: string;
  audience_problem: string;
  supporting_proof: ContentAtom["kernel"]["supporting_proof"];
}): ContentAtom {
  return {
    lineage: { masterTitle: partial.masterTitle },
    kernel: {
      audience_state: partial.audience_state,
      audience_problem: partial.audience_problem,
      supporting_proof: partial.supporting_proof,
    },
  } as ContentAtom;
}

describe("draft-eval", () => {
  it("passes grounded draft", () => {
    const context = {
      evidenceById: {
        ev_known: {
          id: "ev_known",
          recordType: "brand_profile",
          field: "products",
          value: "magnesium",
          sourceUrl: "https://zynava.com",
          sourceSnippet: "magnesium",
          confidence: "high" as const,
        },
      },
      audience: "sleep-focused shoppers",
    } as unknown as ContentBrainContext;

    const result = evaluateDraft({
      artifactId: "atom_test",
      atom: atom({
        masterTitle: "Does magnesium help with sleep?",
        audience_state: "tired adults",
        audience_problem: "poor sleep quality",
        supporting_proof: [
          {
            proof_id: "pf_1",
            meaning: "catalog mention",
            evidence_id: "ev_known",
          },
        ],
      }),
      context,
      masterTitle: "Does magnesium help with sleep?",
    });
    assert.equal(result.status, "PASS");
    assert.equal(result.humanReviewRequired, false);
  });

  it("bounds revision to one pass", () => {
    const empty = { evidenceById: {} } as unknown as ContentBrainContext;
    const grounded = {
      evidenceById: {
        ev_known: {
          id: "ev_known",
          recordType: "x",
          field: "x",
          value: "x",
          sourceUrl: "https://zynava.com",
          sourceSnippet: "x",
          confidence: "high" as const,
        },
      },
    } as unknown as ContentBrainContext;

    const { revisionCount, finalAction, result } = evaluateWithBoundedRevision({
      initial: {
        artifactId: "atom_bad",
        atom: atom({
          masterTitle: "Topic",
          audience_state: "a",
          audience_problem: "needs clarity on magnesium",
          supporting_proof: [
            {
              proof_id: "pf_x",
              meaning: "x",
              evidence_id: "ev_missing",
            },
          ],
        }),
        context: empty,
      },
      reviseOnce: () => ({
        artifactId: "atom_bad",
        atom: atom({
          masterTitle: "Topic",
          audience_state: "a",
          audience_problem: "needs clarity on magnesium",
          supporting_proof: [
            {
              proof_id: "pf_1",
              meaning: "ok",
              evidence_id: "ev_known",
            },
          ],
        }),
        context: grounded,
      }),
    });
    assert.ok(revisionCount <= MAX_DRAFT_REVISIONS);
    assert.equal(revisionCount, 1);
    assert.equal(result.status, "PASS");
    assert.equal(finalAction, "pass");
  });
});
