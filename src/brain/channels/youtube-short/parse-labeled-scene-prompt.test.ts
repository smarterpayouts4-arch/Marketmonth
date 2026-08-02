import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  parseLabeledScenePrompt,
  pasteHasRecognizedSectionHeaders,
  validateLabeledScenePrompt,
} from "./parse-labeled-scene-prompt";

const FIXTURE = readFileSync(
  path.join(process.cwd(), "data/fixtures/scene1-master-prompt-labeled.txt"),
  "utf8"
);

const OST = `Why is
magnesium
attracting attention?

Especially before bed.

Educational only • not medical advice`;

function labeledBrief(overrides?: {
  ost?: string;
  asset?: string;
  motion?: string | null;
  overlay?: boolean;
  crlf?: boolean;
}): string {
  const ost = overrides?.ost ?? OST;
  const asset = overrides?.asset ?? "video";
  const motion =
    overrides?.motion === null
      ? null
      : (overrides?.motion ??
        "She opens the bottle, lifts the glass, drinks, and settles.");
  let text = `SCENE 1

VISUAL PROMPT

Premium photorealistic vertical 9:16 bedroom still. Woman studies amber bottle.

NARRATION

Why is magnesium attracting so much attention as part of a bedtime routine?

ON-SCREEN TEXT

${ost}

ASSET TYPE

${asset}
`;
  if (motion !== null) {
    text += `
MOTION PROMPT

${motion}
`;
  }
  if (overrides?.overlay) {
    text += `
OVERLAY DESIGN NOTES

Use bold title and soft support. Do not put this in visualPrompt.
`;
  }
  return overrides?.crlf ? text.replace(/\n/g, "\r\n") : text;
}

describe("parseLabeledScenePrompt (deterministic)", () => {
  it("parses all five canonical sections from the Scene 1 fixture", () => {
    const validated = validateLabeledScenePrompt(FIXTURE);
    assert.equal(validated.ok, true);
    if (!validated.ok) throw new Error("expected fixture to validate");
    const { fields } = validated;
    assert.ok(fields.visualPrompt.length > 100);
    assert.ok(fields.visualPrompt.length <= 8000);
    assert.match(fields.visualPrompt, /photorealistic|bedroom|supplement/i);
    assert.doesNotMatch(fields.visualPrompt, /^NARRATION$/m);
    assert.doesNotMatch(fields.visualPrompt, /^ON-SCREEN TEXT$/m);
    assert.doesNotMatch(fields.visualPrompt, /^ASSET TYPE$/m);
    assert.doesNotMatch(fields.visualPrompt, /^MOTION PROMPT$/m);
    assert.equal(
      fields.narration,
      "Why is magnesium attracting so much attention as part of a bedtime routine? Many people are curious about its role in winding down before sleep."
    );
    assert.ok(fields.narration.length <= 1200);
    assert.equal(fields.onScreenText, OST);
    assert.ok(fields.onScreenText.includes("\n\n"));
    assert.equal(fields.assetType, "video");
    assert.ok(fields.motionPrompt && fields.motionPrompt.length > 40);
    assert.ok(fields.motionPrompt!.length <= 8000);
    assert.match(fields.motionPrompt!, /opens the bottle|locked vertical/i);
  });

  it("preserves onScreenText line breaks and blank blocks", () => {
    const parsed = parseLabeledScenePrompt(labeledBrief());
    assert.equal(parsed.onScreenText, OST);
  });

  it("parses CRLF and LF", () => {
    const lf = validateLabeledScenePrompt(labeledBrief({ crlf: false }));
    const crlf = validateLabeledScenePrompt(labeledBrief({ crlf: true }));
    assert.equal(lf.ok, true);
    assert.equal(crlf.ok, true);
    if (!lf.ok || !crlf.ok) return;
    assert.equal(lf.fields.onScreenText, crlf.fields.onScreenText);
    assert.equal(lf.fields.assetType, "video");
  });

  it("accepts optional heading colons and ON SCREEN TEXT alias", () => {
    const text = `VISUAL PROMPT:
Still plate.

NARRATION:
Spoken line.

ON SCREEN TEXT:
Why is
magnesium

ASSET TYPE:
video

VIDEO PROMPT:
She lifts the glass and drinks.
`;
    const v = validateLabeledScenePrompt(text);
    assert.equal(v.ok, true);
    if (!v.ok) return;
    assert.equal(v.fields.assetType, "video");
    assert.match(v.fields.motionPrompt!, /lifts the glass/);
    assert.equal(v.fields.onScreenText, "Why is\nmagnesium");
  });

  it("accepts MOTION INSTRUCTIONS alias → motionPrompt", () => {
    const v = validateLabeledScenePrompt(
      labeledBrief({ motion: null }) +
        `\nMOTION INSTRUCTIONS\n\nOrbit slowly around the bottle.\n`
    );
    assert.equal(v.ok, true);
    if (!v.ok) return;
    assert.match(v.fields.motionPrompt!, /Orbit slowly/);
  });

  it("keeps explicit ASSET TYPE video authoritative", () => {
    const v = validateLabeledScenePrompt(labeledBrief({ asset: "Video" }));
    assert.equal(v.ok, true);
    if (!v.ok) return;
    assert.equal(v.fields.assetType, "video");
  });

  it("fails on invalid explicit assetType", () => {
    const v = validateLabeledScenePrompt(labeledBrief({ asset: "reel" }));
    assert.equal(v.ok, false);
    if (v.ok) return;
    assert.match(v.error, /image|video/i);
  });

  it("fails when ON-SCREEN TEXT heading is present but empty", () => {
    const v = validateLabeledScenePrompt(labeledBrief({ ost: "   " }));
    assert.equal(v.ok, false);
    if (v.ok) return;
    assert.match(v.error, /ON-SCREEN TEXT/i);
  });

  it("fails video without motionPrompt", () => {
    const v = validateLabeledScenePrompt(labeledBrief({ motion: null }));
    assert.equal(v.ok, false);
    if (v.ok) return;
    assert.match(v.error, /MOTION PROMPT/i);
  });

  it("allows image asset type without motionPrompt", () => {
    const v = validateLabeledScenePrompt(
      labeledBrief({ asset: "image", motion: null })
    );
    assert.equal(v.ok, true);
    if (!v.ok) return;
    assert.equal(v.fields.assetType, "image");
    assert.equal(v.fields.motionPrompt, undefined);
  });

  it("does not contaminate fields with OVERLAY DESIGN NOTES", () => {
    const parsed = parseLabeledScenePrompt(labeledBrief({ overlay: true }));
    assert.ok(parsed.unknownSections.includes("OVERLAY DESIGN NOTES"));
    assert.doesNotMatch(parsed.visualPrompt ?? "", /bold title/i);
    assert.doesNotMatch(parsed.onScreenText ?? "", /bold title/i);
    assert.doesNotMatch(parsed.motionPrompt ?? "", /bold title/i);
    const v = validateLabeledScenePrompt(labeledBrief({ overlay: true }));
    assert.equal(v.ok, true);
  });

  it("pasteHasRecognizedSectionHeaders is true for labeled briefs only", () => {
    assert.equal(pasteHasRecognizedSectionHeaders(FIXTURE), true);
    assert.equal(
      pasteHasRecognizedSectionHeaders(
        "A calm teal bedroom with soft lamp light and no section labels."
      ),
      false
    );
  });

  it("does not treat body words like narration as headings", () => {
    const parsed = parseLabeledScenePrompt(`VISUAL PROMPT

Subject looks calm during narration rehearsal lighting.

NARRATION

Spoken line here.

ON-SCREEN TEXT

Title

ASSET TYPE

image
`);
    assert.match(parsed.visualPrompt ?? "", /narration rehearsal/);
    assert.equal(parsed.narration, "Spoken line here.");
  });
});
