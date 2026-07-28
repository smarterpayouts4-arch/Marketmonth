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
  master_topic: string;
  audience: ContentAtom["audience"];
  supporting_proof: ContentAtom["supporting_proof"];
}): ContentAtom {
  return partial as ContentAtom;
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
        master_topic: "Does magnesium help with sleep?",
        audience: {
          state: "tired adults",
          problem: "poor sleep quality",
          core_tension: "want rest without guesswork",
        },
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
          master_topic: "Topic",
          audience: {
            state: "a",
            problem: "needs clarity on magnesium",
            core_tension: "t",
          },
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
          master_topic: "Topic",
          audience: {
            state: "a",
            problem: "needs clarity on magnesium",
            core_tension: "t",
          },
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
