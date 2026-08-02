import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  resolveSceneRoleBadge,
  splitOnScreenTextBlocks,
} from "./preview-onscreen-overlay";

/**
 * Checkpoint B + ad-style overlay — DOM text over assetUrl only.
 */
describe("studio preview on-screen overlay (Checkpoint B)", () => {
  const root = process.cwd();
  const previewSrc = readFileSync(
    path.join(
      root,
      "src/components/dashboard/content/studio/preview-canvas.tsx"
    ),
    "utf8"
  );
  const overlaySrc = readFileSync(
    path.join(
      root,
      "src/components/dashboard/content/studio/preview-onscreen-overlay.tsx"
    ),
    "utf8"
  );
  const workspaceSrc = readFileSync(
    path.join(
      root,
      "src/components/dashboard/content/studio/vision-shell/youtube-workspace.tsx"
    ),
    "utf8"
  );
  const cssSrc = readFileSync(
    path.join(root, "src/styles/content-studio.css"),
    "utf8"
  );

  it("renders overlay from resolved overlayText when assetUrl is present", () => {
    assert.match(previewSrc, /SceneOnScreenOverlay/);
    assert.match(previewSrc, /preview-onscreen-overlay/);
    assert.match(previewSrc, /const overlayText =/);
    assert.match(
      previewSrc,
      /promptMode === "manual"[\s\S]*sceneEdits\?\.onScreenText/
    );
    assert.match(
      previewSrc,
      /SceneOnScreenOverlay[\s\S]*onScreenText=\{overlayText\}/
    );
    assert.match(previewSrc, /showBadges=\{false\}/);
    // Composed MP4 burns title — DOM overlay must not double-render.
    assert.match(previewSrc, /showDomOverlay/);
    assert.match(previewSrc, /!showingComposed/);
    assert.doesNotMatch(previewSrc, /studio-preview-image-label/);
    assert.doesNotMatch(previewSrc, /Generated still/);
    assert.match(overlaySrc, /studio-preview-onscreen-overlay/);
    assert.match(overlaySrc, /splitOnScreenTextBlocks/);
    assert.match(overlaySrc, /studio-preview-onscreen-overlay__accent/);
    assert.match(overlaySrc, /@\/brain\/content-studio/);
    assert.doesNotMatch(overlaySrc, /@\/brain\/channels/);
  });

  it("youtube workspace passes Manual sceneEdits + promptMode into preview", () => {
    assert.match(
      workspaceSrc,
      /StudioPreviewCanvas[\s\S]*sceneEdits=\{isShort \? sceneEdits/
    );
    assert.match(
      workspaceSrc,
      /StudioPreviewCanvas[\s\S]*promptMode=\{isShort \? promptMode/
    );
  });

  it("styles left-stack title, accent, upright support, and bottom disclaimer", () => {
    assert.match(cssSrc, /\.studio-preview-onscreen-overlay\b/);
    assert.match(cssSrc, /\.studio-preview-onscreen-overlay__title\b/);
    assert.match(cssSrc, /\.studio-preview-onscreen-overlay__accent\b/);
    assert.match(cssSrc, /\.studio-preview-onscreen-overlay__support\b/);
    assert.match(cssSrc, /\.studio-preview-onscreen-overlay__disclaimer\b/);
    assert.match(
      cssSrc,
      /\.studio-preview-onscreen-overlay__support[\s\S]*font-style:\s*normal/
    );
    assert.match(
      cssSrc,
      /\.studio-preview-onscreen-overlay__disclaimer[\s\S]*margin-top:\s*auto/
    );
    assert.match(cssSrc, /white-space:\s*pre-line/);
    assert.match(cssSrc, /max-width:\s*58%/);
    assert.match(
      cssSrc,
      /\.studio-preview-onscreen-overlay__title[\s\S]*clamp\(1\.05rem/
    );
  });

  it("splits blank-line OST blocks", () => {
    const blocks = splitOnScreenTextBlocks(
      "Why is\nmagnesium\nattracting\nattention?\n\nEspecially\nbefore bed.\n\nEducational only • not medical advice"
    );
    assert.match(blocks.title, /magnesium/i);
    assert.match(blocks.title, /attracting/i);
    assert.match(blocks.support ?? "", /Especially before bed/i);
    assert.match(blocks.disclaimer ?? "", /Educational only/);
    assert.equal(resolveSceneRoleBadge(0), "hook");
  });

  it("splits one-paragraph OST into title / support / disclaimer", () => {
    const blocks = splitOnScreenTextBlocks(
      "Why is magnesium attracting attention? Especially before bed. Educational only • not medical advice"
    );
    assert.match(blocks.title, /magnesium/i);
    assert.match(blocks.title, /attracting attention/i);
    assert.doesNotMatch(blocks.title, /Especially/i);
    assert.doesNotMatch(blocks.title, /Educational/i);
    assert.equal(blocks.support, "Especially before bed.");
    assert.match(blocks.disclaimer ?? "", /Educational only/);
  });

  it("does not burn overlay into Gemini prompt composition", () => {
    const compose = readFileSync(
      path.join(
        root,
        "src/brain/channels/youtube-short/compose-effective-image-prompt.ts"
      ),
      "utf8"
    );
    assert.doesNotMatch(compose, /studio-preview-onscreen-overlay/);
    assert.doesNotMatch(compose, /onScreenText/);
  });
});
