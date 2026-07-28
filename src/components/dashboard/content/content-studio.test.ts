import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  CHANNEL_FORMATS,
  CHANNEL_LABELS,
  CONTENT_STUDIO_CHANNELS,
  defaultFormat,
  isStudioChannelEnabled,
  isSupportedFormat,
  logicalSizeFor,
} from "./studio-channels";
import { computePreviewScale } from "./hooks/use-preview-scale";
import { PROMPT_INSPECTOR_TABS } from "./prompt-inspector/prompt-inspector-tabs";
import { buildStudioPrompt } from "./prompt-inspector/prompt-panel";

const root = process.cwd();

describe("Content Studio channel manifest", () => {
  it("lists registry-backed studio channels with YouTube Short first", () => {
    assert.equal(CONTENT_STUDIO_CHANNELS[0], "youtube_short");
    assert.ok(CONTENT_STUDIO_CHANNELS.includes("linkedin"));
    assert.ok(CONTENT_STUDIO_CHANNELS.includes("tiktok"));
    assert.ok(CONTENT_STUDIO_CHANNELS.includes("x"));
  });

  it("enables only YouTube Short", () => {
    assert.equal(isStudioChannelEnabled("youtube_short"), true);
    assert.equal(isStudioChannelEnabled("facebook"), false);
    assert.equal(isStudioChannelEnabled("youtube"), false);
  });

  it("labels YouTube Long and YouTube Shorts distinctly", () => {
    assert.equal(CHANNEL_LABELS.youtube, "YouTube Long");
    assert.equal(CHANNEL_LABELS.youtube_short, "YouTube Shorts");
  });

  it("provides channel-specific formats and defaults", () => {
    assert.deepEqual(CHANNEL_FORMATS.youtube_short, ["short_video"]);
    assert.equal(defaultFormat("youtube_short"), "short_video");
    assert.equal(isSupportedFormat("facebook", "post"), true);
    assert.equal(isSupportedFormat("facebook", "single_post"), false);
  });

  it("defines logical preview dimensions per channel", () => {
    assert.deepEqual(logicalSizeFor("facebook", "post"), {
      width: 1200,
      height: 1200,
    });
    assert.deepEqual(logicalSizeFor("youtube_short", "short_video"), {
      width: 1080,
      height: 1920,
    });
  });
});

describe("PreviewScaler math", () => {
  it("fits logical canvas into available frame without upscaling", () => {
    assert.equal(computePreviewScale(600, 300, 1200, 1200), 0.25);
    assert.equal(computePreviewScale(2000, 2000, 1200, 1200), 1);
    assert.equal(computePreviewScale(0, 300, 1200, 1200), 1);
  });
});

describe("Prompt Inspector tabs", () => {
  it("defines Directions / Atom / YouTube Short / Prompt stages", () => {
    assert.deepEqual([...PROMPT_INSPECTOR_TABS], [
      "directions",
      "atom",
      "youtube_short",
      "prompt",
    ]);
  });

  it("builds a complete copyable prompt", () => {
    const prompt = buildStudioPrompt({
      handoff: {
        version: 1,
        brand: { name: "Zynava", domain: "zynava.com" },
        generationId: "tgen_d1",
        contextVersion: "c1",
        mode: "automatic",
        masterTopic: {
          id: "m1",
          source: "automatic",
          punchline: "Topic",
          subheading: "",
          rationale: "",
          evidenceIds: [],
          confidence: "high",
          safety: { status: "safe", reasons: [] },
        },
        variations: [
          {
            id: "v1",
            angle: "decision_guide",
            punchline: "Var",
            subheading: "",
            brief: "Brief",
            audienceProblem: "",
            strategicPurpose: "",
            suggestedCta: "Learn",
            destination: "https://zynava.com",
            evidenceIds: [],
            assumptionIds: [],
            confidence: "high",
            safety: { status: "safe", reasons: [] },
          },
          {
            id: "v2",
            angle: "decision_guide",
            punchline: "Var2",
            subheading: "",
            brief: "Brief",
            audienceProblem: "",
            strategicPurpose: "",
            suggestedCta: "Learn",
            destination: "https://zynava.com",
            evidenceIds: [],
            assumptionIds: [],
            confidence: "high",
            safety: { status: "safe", reasons: [] },
          },
          {
            id: "v3",
            angle: "decision_guide",
            punchline: "Var3",
            subheading: "",
            brief: "Brief",
            audienceProblem: "",
            strategicPurpose: "",
            suggestedCta: "Learn",
            destination: "https://zynava.com",
            evidenceIds: [],
            assumptionIds: [],
            confidence: "high",
            safety: { status: "safe", reasons: [] },
          },
          {
            id: "v4",
            angle: "decision_guide",
            punchline: "Var4",
            subheading: "",
            brief: "Brief",
            audienceProblem: "",
            strategicPurpose: "",
            suggestedCta: "Learn",
            destination: "https://zynava.com",
            evidenceIds: [],
            assumptionIds: [],
            confidence: "high",
            safety: { status: "safe", reasons: [] },
          },
          {
            id: "v5",
            angle: "decision_guide",
            punchline: "Var5",
            subheading: "",
            brief: "Brief",
            audienceProblem: "",
            strategicPurpose: "",
            suggestedCta: "Learn",
            destination: "https://zynava.com",
            evidenceIds: [],
            assumptionIds: [],
            confidence: "high",
            safety: { status: "safe", reasons: [] },
          },
          {
            id: "v6",
            angle: "decision_guide",
            punchline: "Var6",
            subheading: "",
            brief: "Brief",
            audienceProblem: "",
            strategicPurpose: "",
            suggestedCta: "Learn",
            destination: "https://zynava.com",
            evidenceIds: [],
            assumptionIds: [],
            confidence: "high",
            safety: { status: "safe", reasons: [] },
          },
        ],
        selectedVariationId: "v1",
        selectedAt: "2026-07-25T12:00:00.000Z",
      },
      atom: null,
      pkg: null,
      channel: "youtube_short",
    });
    assert.match(prompt, /Content Studio Prompt/);
    assert.match(prompt, /Channel: youtube_short/);
    assert.match(prompt, /Topic/);
  });
});

describe("Content Studio cleanup", () => {
  it("does not import deleted ContentUniverse or content-phase-panel", () => {
    const contentPage = readFileSync(
      path.join(root, "src/app/(app)/content/page.tsx"),
      "utf8"
    );
    assert.match(contentPage, /ContentStudio/);
    assert.doesNotMatch(contentPage, /ContentUniverse/);

    const dashboardHome = readFileSync(
      path.join(root, "src/components/dashboard/dashboard-home.tsx"),
      "utf8"
    );
    assert.doesNotMatch(dashboardHome, /ContentPhasePanel/);
  });

  it("uses registry Studio and does not import content-production", () => {
    const studio = readFileSync(
      path.join(root, "src/components/dashboard/content/content-studio.tsx"),
      "utf8"
    );
    assert.match(studio, /ContentStudioHeader/);
    assert.match(studio, /promptInspectorEnabled/);
    assert.doesNotMatch(studio, /@\/brain\/content-production/);
    assert.equal(
      existsSync(path.join(root, "src/brain/content-production")),
      false
    );
  });

  it("channel tabs include LinkedIn as not_connected scaffold", () => {
    const tabs = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/content-channel-tabs.tsx"
      ),
      "utf8"
    );
    assert.match(tabs, /CONTENT_STUDIO_CHANNELS/);
    assert.match(tabs, /linkedin/);
    assert.match(tabs, /not connected/i);
  });
});
