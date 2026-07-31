import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  composeEffectiveImagePrompt,
  composeShortSceneEffectiveImagePrompt,
  hashEffectiveImagePrompt,
  SHORT_IMAGE_PROMPT_EXCLUSIONS,
} from "./compose-effective-image-prompt";
import { shortRenderInputSchema } from "./short-render-input";

describe("Phase 4A effective prompt + ShortRenderInput", () => {
  it("composes Global Visual Style with scene visualPrompt", () => {
    const out = composeEffectiveImagePrompt("style A", "scene B");
    assert.equal(out, "style A\n\nscene B");
  });

  it("preserves a 3,300-character scene prompt", () => {
    const scene = "S".repeat(3300);
    const out = composeShortSceneEffectiveImagePrompt("global style", scene);
    assert.match(out, new RegExp(`^global style\\n\\n${"S".repeat(3300)}`));
    assert.ok(out.includes("Vertical 9:16"));
    assert.ok(out.includes(SHORT_IMAGE_PROMPT_EXCLUSIONS[0]));
    assert.ok(out.includes(scene));
    assert.ok(!out.includes(scene.slice(0, 800) + "…"));
  });

  it("preserves an 8,000-character scene prompt with no 800 truncation", () => {
    const scene = "V".repeat(8000);
    const out = composeShortSceneEffectiveImagePrompt(undefined, scene);
    assert.ok(out.startsWith(scene));
    assert.equal(out.includes(scene), true);
    assert.ok(out.length > 8000);
  });

  it("prompt hash is deterministic and changes with style or scene", () => {
    const a = composeShortSceneEffectiveImagePrompt("style", "scene");
    const b = composeShortSceneEffectiveImagePrompt("style", "scene");
    const c = composeShortSceneEffectiveImagePrompt("style2", "scene");
    const d = composeShortSceneEffectiveImagePrompt("style", "scene2");
    assert.equal(hashEffectiveImagePrompt(a), hashEffectiveImagePrompt(b));
    assert.notEqual(hashEffectiveImagePrompt(a), hashEffectiveImagePrompt(c));
    assert.notEqual(hashEffectiveImagePrompt(a), hashEffectiveImagePrompt(d));
  });

  it("ShortRenderInput accepts valid provider-neutral image requests", () => {
    const parsed = shortRenderInputSchema.parse({
      requestId: "req_1",
      channel: "youtube_short",
      formatId: "youtube_short",
      atomId: "atom_1",
      sceneId: "scene_1",
      sceneRevision: "rev_1",
      outputKind: "image",
      aspectRatio: "9:16",
      effectivePrompt: "prompt",
      promptHash: "h".repeat(64),
      requestedAt: new Date().toISOString(),
    });
    assert.equal(parsed.outputKind, "image");
    assert.equal(parsed.aspectRatio, "9:16");
  });

  it("ShortRenderInput rejects provider-specific fields via strip/unknown", () => {
    const result = shortRenderInputSchema.safeParse({
      requestId: "req_1",
      channel: "youtube_short",
      formatId: "youtube_short",
      atomId: "atom_1",
      sceneId: "scene_1",
      sceneRevision: "rev_1",
      outputKind: "image",
      aspectRatio: "9:16",
      effectivePrompt: "prompt",
      promptHash: "h".repeat(64),
      requestedAt: new Date().toISOString(),
      geminiModel: "should-not-exist",
      imagekitFolder: "nope",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(
        "geminiModel" in result.data,
        false,
        "provider fields must not be part of the typed contract"
      );
    }
  });
});
