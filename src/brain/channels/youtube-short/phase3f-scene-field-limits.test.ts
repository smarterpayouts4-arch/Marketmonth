import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  sceneCardSchema,
  videoChapterSchema,
  youtubeShortFormatPackageSchema,
} from "@/brain/content-studio/schemas/format-package";
import { tokenBudget } from "@/brain/policy/token-budgets";

import {
  SCENE_NARRATION_MAX_CHARS,
  SCENE_ON_SCREEN_TEXT_MAX_CHARS,
  SCENE_PASTE_PROMPT_MAX_CHARS,
  SCENE_VISUAL_PROMPT_MAX_CHARS,
  SHORT_PACKAGE_IMAGE_PROMPT_MAX_CHARS,
  VIDEO_CHAPTER_VISUAL_PROMPT_MAX_CHARS,
} from "./scene-field-limits";
import {
  youtubeShortDurableEditsSchema,
  youtubeShortDurableSceneEditSchema,
  youtubeShortSceneIngestExtractSchema,
} from "./youtube-short-draft";

function sceneBase(visualPrompt: string) {
  return {
    visualPrompt,
    narration: "Why is magnesium getting so much attention?",
    onScreenText: "Why is magnesium getting so much attention?",
    assetType: "image" as const,
  };
}

describe("Phase 3F Short scene field limits", () => {
  it("locks shared policy constants", () => {
    assert.equal(SCENE_PASTE_PROMPT_MAX_CHARS, 16_000);
    assert.equal(SCENE_VISUAL_PROMPT_MAX_CHARS, 8_000);
    assert.equal(SCENE_NARRATION_MAX_CHARS, 1_200);
    assert.equal(SCENE_ON_SCREEN_TEXT_MAX_CHARS, 160);
    assert.equal(SHORT_PACKAGE_IMAGE_PROMPT_MAX_CHARS, 800);
    assert.equal(VIDEO_CHAPTER_VISUAL_PROMPT_MAX_CHARS, 800);
    assert.ok(SCENE_PASTE_PROMPT_MAX_CHARS > SCENE_VISUAL_PROMPT_MAX_CHARS);
  });

  it("tokenBudget(shortSceneIngest) equals 4000", () => {
    assert.equal(tokenBudget("shortSceneIngest"), 4_000);
  });

  it("accepts a 4169-character Scene 1 visual prompt", () => {
    const visual = "V".repeat(4169);
    const parsed = youtubeShortSceneIngestExtractSchema.safeParse(
      sceneBase(visual)
    );
    assert.equal(parsed.success, true);
    if (!parsed.success) return;
    assert.equal(parsed.data.visualPrompt.length, 4169);
  });

  it("visualPrompt length 8000 passes ingest, durable, and sceneCard", () => {
    const visual = "x".repeat(SCENE_VISUAL_PROMPT_MAX_CHARS);
    assert.equal(
      youtubeShortSceneIngestExtractSchema.safeParse(sceneBase(visual)).success,
      true
    );
    assert.equal(
      youtubeShortDurableSceneEditSchema.safeParse({ visualPrompt: visual })
        .success,
      true
    );
    assert.equal(
      sceneCardSchema.safeParse({
        id: "s1",
        order: 0,
        durationSeconds: 5,
        narration: "n",
        onScreenText: "",
        visualPrompt: visual,
        assetType: "image",
      }).success,
      true
    );
  });

  it("visualPrompt length 8001 fails with Too big on visualPrompt", () => {
    const visual = "x".repeat(SCENE_VISUAL_PROMPT_MAX_CHARS + 1);
    const ingest = youtubeShortSceneIngestExtractSchema.safeParse(
      sceneBase(visual)
    );
    assert.equal(ingest.success, false);
    if (ingest.success) return;
    assert.equal(ingest.error.issues[0]?.path[0], "visualPrompt");
    assert.match(
      ingest.error.issues[0]?.message ?? "",
      /Too big: expected string to have <=8000 characters/
    );
  });

  it("paste source ceiling is 16000 (documented for ingest gate)", () => {
    assert.equal(SCENE_PASTE_PROMPT_MAX_CHARS, 16_000);
    const ingestSrc = readFileSync(
      path.join(
        process.cwd(),
        "src/brain/channels/youtube-short/ingest-scene-prompt.ts"
      ),
      "utf8"
    );
    assert.match(ingestSrc, /SCENE_PASTE_PROMPT_MAX_CHARS/);
    assert.doesNotMatch(ingestSrc, /MAX_PROMPT_CHARS\s*=\s*8_?000/);
    assert.match(
      ingestSrc,
      new RegExp(`visualPrompt ≤ \\$\\{SCENE_VISUAL_PROMPT_MAX_CHARS\\}`)
    );
  });

  it("narration remains capped at 1200", () => {
    const ok = youtubeShortSceneIngestExtractSchema.safeParse({
      ...sceneBase("visual"),
      narration: "n".repeat(SCENE_NARRATION_MAX_CHARS),
    });
    const over = youtubeShortSceneIngestExtractSchema.safeParse({
      ...sceneBase("visual"),
      narration: "n".repeat(SCENE_NARRATION_MAX_CHARS + 1),
    });
    assert.equal(ok.success, true);
    assert.equal(over.success, false);
    if (!over.success) {
      assert.equal(over.error.issues[0]?.path[0], "narration");
    }
  });

  it("onScreenText remains capped at 160", () => {
    const ok = youtubeShortSceneIngestExtractSchema.safeParse({
      ...sceneBase("visual"),
      onScreenText: "o".repeat(SCENE_ON_SCREEN_TEXT_MAX_CHARS),
    });
    const over = youtubeShortSceneIngestExtractSchema.safeParse({
      ...sceneBase("visual"),
      onScreenText: "o".repeat(SCENE_ON_SCREEN_TEXT_MAX_CHARS + 1),
    });
    assert.equal(ok.success, true);
    assert.equal(over.success, false);
    if (!over.success) {
      assert.equal(over.error.issues[0]?.path[0], "onScreenText");
    }
  });

  it("assetType remains image or video only", () => {
    assert.equal(
      youtubeShortSceneIngestExtractSchema.safeParse({
        ...sceneBase("visual"),
        assetType: "image",
      }).success,
      true
    );
    assert.equal(
      youtubeShortSceneIngestExtractSchema.safeParse({
        ...sceneBase("visual"),
        assetType: "video",
      }).success,
      true
    );
    assert.equal(
      youtubeShortSceneIngestExtractSchema.safeParse({
        ...sceneBase("visual"),
        assetType: "audio",
      }).success,
      false
    );
  });

  it("package imagePrompt remains capped at 800", () => {
    const ok = youtubeShortDurableEditsSchema.safeParse({
      imagePrompt: "i".repeat(SHORT_PACKAGE_IMAGE_PROMPT_MAX_CHARS),
    });
    const over = youtubeShortDurableEditsSchema.safeParse({
      imagePrompt: "i".repeat(SHORT_PACKAGE_IMAGE_PROMPT_MAX_CHARS + 1),
    });
    assert.equal(ok.success, true);
    assert.equal(over.success, false);
    if (!over.success) {
      assert.equal(over.error.issues[0]?.path[0], "imagePrompt");
    }
    const pkgImage = youtubeShortFormatPackageSchema.shape.imagePrompt;
    assert.equal(
      pkgImage.safeParse("i".repeat(SHORT_PACKAGE_IMAGE_PROMPT_MAX_CHARS))
        .success,
      true
    );
    assert.equal(
      pkgImage.safeParse(
        "i".repeat(SHORT_PACKAGE_IMAGE_PROMPT_MAX_CHARS + 1)
      ).success,
      false
    );
  });

  it("Video chapter visualPrompt remains capped at 800", () => {
    const base = {
      id: "ch1",
      order: 0,
      title: "Hook",
      durationSeconds: 30,
      narration: "Spoken chapter line",
      keyPoint: "Key point",
    };
    assert.equal(
      videoChapterSchema.safeParse({
        ...base,
        visualPrompt: "v".repeat(VIDEO_CHAPTER_VISUAL_PROMPT_MAX_CHARS),
      }).success,
      true
    );
    assert.equal(
      videoChapterSchema.safeParse({
        ...base,
        visualPrompt: "v".repeat(VIDEO_CHAPTER_VISUAL_PROMPT_MAX_CHARS + 1),
      }).success,
      false
    );
  });

  it("does not silently truncate — over-limit values fail rather than shrink", () => {
    const visual = "x".repeat(SCENE_VISUAL_PROMPT_MAX_CHARS + 50);
    const parsed = youtubeShortSceneIngestExtractSchema.safeParse(
      sceneBase(visual)
    );
    assert.equal(parsed.success, false);
    // No successful parse with a shortened string — failure only.
  });

  it("Studio scene-editor maxHint imports shared visual constant", () => {
    const src = readFileSync(
      path.join(
        process.cwd(),
        "src/components/dashboard/content/studio/prompt-rail/scene-editor.tsx"
      ),
      "utf8"
    );
    assert.match(src, /SCENE_VISUAL_PROMPT_MAX_CHARS/);
    assert.match(src, /SCENE_NARRATION_MAX_CHARS/);
    assert.match(src, /SCENE_ON_SCREEN_TEXT_MAX_CHARS/);
    assert.doesNotMatch(src, /maxHint=\{800\}/);
  });
});
