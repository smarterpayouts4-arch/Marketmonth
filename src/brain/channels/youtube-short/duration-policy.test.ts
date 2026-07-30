import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  YOUTUBE_SHORT_DURATION_DEFAULT_SECONDS,
  YOUTUBE_SHORT_DURATION_MAX_SECONDS,
  isYouTubeShortDurationWithinPolicy,
  youtubeShortDurationPolicyError,
} from "./duration-policy";
import {
  youtubeShortDraftSchema,
  youtubeShortDurableEditsSchema,
} from "./youtube-short-draft";

describe("YouTube Short duration policy", () => {
  it("keeps default below max and max at 180", () => {
    assert.equal(YOUTUBE_SHORT_DURATION_DEFAULT_SECONDS, 60);
    assert.equal(YOUTUBE_SHORT_DURATION_MAX_SECONDS, 180);
    assert.ok(
      YOUTUBE_SHORT_DURATION_DEFAULT_SECONDS <
        YOUTUBE_SHORT_DURATION_MAX_SECONDS
    );
  });

  it("accepts default and max; rejects above max", () => {
    assert.equal(isYouTubeShortDurationWithinPolicy(60), true);
    assert.equal(isYouTubeShortDurationWithinPolicy(180), true);
    assert.equal(isYouTubeShortDurationWithinPolicy(181), false);
    assert.match(
      youtubeShortDurationPolicyError(181) ?? "",
      /exceeds 180s/
    );
  });
});

describe("YouTubeShortDraft contract", () => {
  it("parses an atom-sourced draft within policy", () => {
    const parsed = youtubeShortDraftSchema.safeParse({
      formatId: "youtube_short",
      aspectRatio: "9:16",
      title: "Test short",
      hook: "Open with the decision",
      script: "Full script body",
      durationSeconds: 45,
      scenes: [
        {
          id: "s1",
          order: 0,
          durationSeconds: 20,
          narration: "Hook line",
          visualPrompt: "Wide shot of product",
        },
        {
          id: "s2",
          order: 1,
          durationSeconds: 25,
          narration: "Payoff line",
          visualPrompt: "Close-up proof",
        },
      ],
      imagePrompt: "Thumbnail still",
      voiceoverPrompt: "Narrate clearly",
      provenance: {
        source: "atom",
        atomId: "atom_test",
        atomRevision: 1,
      },
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(
        parsed.data.targetDurationSeconds,
        YOUTUBE_SHORT_DURATION_DEFAULT_SECONDS
      );
    }
  });

  it("rejects drafts above policy max", () => {
    const parsed = youtubeShortDraftSchema.safeParse({
      formatId: "youtube_short",
      aspectRatio: "9:16",
      title: "Too long",
      hook: "Hook",
      script: "Script",
      durationSeconds: 181,
      scenes: [
        {
          id: "s1",
          order: 0,
          durationSeconds: 90,
          narration: "A",
          visualPrompt: "V1",
        },
        {
          id: "s2",
          order: 1,
          durationSeconds: 91,
          narration: "B",
          visualPrompt: "V2",
        },
      ],
      imagePrompt: "Img",
      voiceoverPrompt: "Voice",
      provenance: {
        source: "manual",
        manualDraftId: "manual_1",
        companyId: "co_1",
      },
    });
    assert.equal(parsed.success, false);
  });

  it("accepts durable edit payload shape", () => {
    const parsed = youtubeShortDurableEditsSchema.safeParse({
      imagePrompt: "Updated still",
      voiceoverPrompt: "Updated VO",
      script: "Updated script",
    });
    assert.equal(parsed.success, true);
  });
});
