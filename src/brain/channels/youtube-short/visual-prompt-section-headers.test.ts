import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { YouTubeShortFormatPackage } from "@/brain/content-studio/schemas/format-package";

import { validateShortFormatPackage } from "./validate-format-package";
import {
  visualPromptContainsReservedSectionHeaders,
  visualPromptReservedSectionHeaderError,
} from "./visual-prompt-section-headers";

function minimalShortPackage(
  visualPrompt: string
): YouTubeShortFormatPackage {
  return {
    id: "fmt_test",
    atomId: "atom_test",
    atomRevision: 1,
    formatId: "youtube_short",
    status: "draft",
    title: "Test",
    durationSeconds: 30,
    aspectRatio: "9:16",
    hook: "Hook",
    voiceoverPrompt: "VO",
    imagePrompt: "Img",
    script: "Script",
    scenes: [
      {
        id: "s1_hook",
        order: 0,
        durationSeconds: 30,
        narration: "Spoken line",
        onScreenText: "Title",
        visualPrompt,
        assetType: "image",
      },
    ],
    caption: "Cap",
    audienceAction: "Act",
    evidenceRefs: [],
    unresolvedResearch: [],
    warnings: [],
    generation: {
      provider: "deterministic",
      model: "none",
      templateVersion: "t1",
      adapterVersion: "a1",
      generatedAt: new Date().toISOString(),
      idempotencyKey: "k1",
    },
  } as YouTubeShortFormatPackage;
}

describe("visualPrompt reserved section headers", () => {
  it("detects NARRATION / ON-SCREEN TEXT / ASSET TYPE / MOTION section lines", () => {
    assert.equal(
      visualPromptContainsReservedSectionHeaders(
        "Bedroom still.\n\nNARRATION\nSpoken line"
      ),
      true
    );
    assert.equal(
      visualPromptContainsReservedSectionHeaders(
        "Clean plate\nON-SCREEN TEXT:\nHeadline"
      ),
      true
    );
    assert.equal(
      visualPromptContainsReservedSectionHeaders(
        "Still brief\n\nASSET TYPE\nimage"
      ),
      true
    );
    assert.equal(
      visualPromptContainsReservedSectionHeaders(
        "Still plate\n\nMOTION PROMPT\nShe lifts the glass"
      ),
      true
    );
    assert.equal(
      visualPromptContainsReservedSectionHeaders(
        "Still plate\n\nVIDEO PROMPT:\nOrbit"
      ),
      true
    );
    assert.equal(
      visualPromptContainsReservedSectionHeaders(
        "Vertical bedroom scene, soft morning light, no text overlays."
      ),
      false
    );
  });

  it("does not treat the word narration mid-sentence as a section header", () => {
    assert.equal(
      visualPromptContainsReservedSectionHeaders(
        "Subject looks calm during narration rehearsal lighting."
      ),
      false
    );
  });

  it("validateShortFormatPackage rejects contaminated visualPrompt on durable path", () => {
    const errors = validateShortFormatPackage(
      minimalShortPackage(
        "Clean bedroom plate.\n\nNARRATION\nSpoken hook line\n\nON-SCREEN TEXT\nTitle\n\nASSET TYPE\nimage"
      ),
      { atom_id: "atom_test" } as never,
      1
    );
    assert.ok(
      errors.some((e) => /reserved section headers/i.test(e)),
      `expected contamination error, got: ${errors.join("; ")}`
    );
    assert.ok(errors.some((e) => e.includes("s1_hook")));
  });

  it("validateShortFormatPackage accepts clean visualPrompt", () => {
    const errors = validateShortFormatPackage(
      minimalShortPackage(
        "Vertical 9:16 bedroom still, soft daylight, product on nightstand, leave negative space at top for later overlay."
      ),
      { atom_id: "atom_test" } as never,
      1
    );
    assert.deepEqual(
      errors.filter((e) => /reserved section headers/i.test(e)),
      []
    );
  });

  it("error helper returns null when clean", () => {
    assert.equal(
      visualPromptReservedSectionHeaderError("Soft window light, unbranded bottle."),
      null
    );
  });
});
