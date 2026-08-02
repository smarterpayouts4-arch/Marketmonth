import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { buildOnScreenTextLayout } from "@/brain/content-studio/on-screen-text-layout";

import { buildTitleAssOverlay } from "./build-title-ass";

const OST =
  "Why is\nmagnesium\nattracting attention?\n\nEspecially before bed.\n\nEducational only • not medical advice";

describe("buildTitleAssOverlay (title parity)", () => {
  it("omits Scene badge unless showSceneBadge is explicitly true", () => {
    const layout = buildOnScreenTextLayout({
      onScreenText: OST,
      sceneOrder: 0,
    });
    assert.equal(layout.showSceneBadge, false);
    assert.equal(layout.sceneLabel, "");

    const ass = buildTitleAssOverlay({
      overlay: {
        titleLines: layout.titleLines,
        supportingText: layout.support,
        disclaimer: layout.disclaimer,
        sceneLabel: layout.sceneLabel,
        showSceneBadge: layout.showSceneBadge,
        accentWord: layout.accentWord,
      },
      durationSeconds: 4.73,
      width: 1080,
      height: 1920,
      fontFamily: "Segoe UI",
    });

    assert.doesNotMatch(ass, /Dialogue:.*Badge.*,Scene 1/);
    assert.doesNotMatch(ass, /,Scene 1$/m);
    assert.match(ass, /Style: Title,Segoe UI,/);
    assert.match(ass, /magnesium/i);
    assert.match(ass, /Especially before bed/);
    assert.match(ass, /Educational only/);
    assert.match(ass, /PlayResX: 1080/);
    assert.match(ass, /PlayResY: 1920/);
  });

  it("renders badge only when showSceneBadge is true", () => {
    const layout = buildOnScreenTextLayout({
      onScreenText: OST,
      sceneOrder: 0,
      showSceneBadge: true,
    });
    assert.equal(layout.sceneLabel, "Scene 1");
    const ass = buildTitleAssOverlay({
      overlay: {
        titleLines: layout.titleLines,
        supportingText: layout.support,
        disclaimer: layout.disclaimer,
        sceneLabel: layout.sceneLabel,
        showSceneBadge: true,
        accentWord: layout.accentWord,
      },
      durationSeconds: 4,
      width: 1080,
      height: 1920,
      fontFamily: "Arial",
    });
    assert.match(ass, /Dialogue:.*Badge.*,Scene 1/);
  });

  it("does not hard-code Scene 1 in the ASS builder source", () => {
    const src = readFileSync(
      path.join(process.cwd(), "src/brain/render/adapters/build-title-ass.ts"),
      "utf8"
    );
    assert.doesNotMatch(src, /Scene 1/);
  });

  it("preserves explicit title line breaks from durable onScreenText", () => {
    const layout = buildOnScreenTextLayout({
      onScreenText: OST,
      sceneOrder: 0,
    });
    assert.deepEqual(layout.titleLines, [
      "Why is",
      "magnesium",
      "attracting attention?",
    ]);
    assert.equal(layout.support, "Especially before bed.");
    assert.match(layout.disclaimer ?? "", /Educational only/);
    assert.equal(layout.accentWord?.toLowerCase(), "magnesium");
  });
});
