import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  PLATFORM_REGISTRY,
  defaultFormatIdsForYoutube,
  listActiveFormatsForPlatform,
} from "@/brain/content-studio";

import { buildExternalVideoPrompt } from "./studio/build-external-prompt";

const root = process.cwd();

describe("Content Studio atomId-only entry", () => {
  it("routes atomId to vision shell and bare /content to empty state", () => {
    const studio = readFileSync(
      path.join(root, "src/components/dashboard/content/content-studio.tsx"),
      "utf8"
    );
    assert.match(studio, /AtomDeepLinkStudio/);
    assert.match(studio, /ContentEmptyState/);
    assert.equal(studio.includes("LegacyHandoffContentStudio"), false);
    assert.equal(studio.includes("useContentStudio"), false);
    assert.equal(studio.includes("use-content-studio"), false);
    assert.equal(studio.includes("promptInspectorEnabled"), false);
  });

  it("ships dense vision shell: toolbar, header actions, overlay atom, prompt rail", () => {
    const shell = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/vision-shell.tsx"
      ),
      "utf8"
    );
    assert.match(shell, /StudioPlatformToolbar/);
    assert.match(shell, /StudioPromptRail/);
    assert.match(shell, /StudioPreviewCanvas/);
    assert.match(shell, /StudioStoryboard/);
    assert.match(shell, /studio-header/);
    assert.match(shell, /studio-header__brand/);
    assert.match(shell, /studio-header__actions/);
    assert.match(shell, /studio-header__platforms/);
    assert.match(shell, /studio-workspace/);
    assert.match(shell, /studio-strategy-toggle/);
    assert.match(shell, /studio-strategy-overlay/);
    assert.match(shell, /studio-copy-chatgpt-prompt/);
    assert.match(shell, /studio-regenerate/);
    assert.match(shell, /studio-export-disabled/);
    assert.match(shell, /data-studio-shell/);
    assert.match(shell, /AtomReviewPanel/);
    assert.match(shell, /buildExternalVideoPrompt/);
    assert.match(shell, /\n\s*Strategy\n/);
    assert.match(shell, /promptCopied \? "Copied" : "Prompt"/);
    assert.match(shell, /\n\s*Regen\n/);
    assert.match(shell, /title="Strategy \/ Content Atom"/);
    assert.equal(shell.includes(">Strategy / Content Atom<"), false);
    assert.equal(shell.includes("ChatGPT prompt"), false);
    assert.equal(shell.includes("StudioPlatformTabs"), false);
    assert.equal(shell.includes("StudioFormatTabs"), false);
    assert.equal(shell.includes("h-[248px]"), false);
    assert.equal(shell.includes("100dvh"), false);
    assert.equal(
      existsSync(
        path.join(
          root,
          "src/components/dashboard/content/studio/production-inspector.tsx"
        )
      ),
      false
    );

    const canvas = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/preview-canvas.tsx"
      ),
      "utf8"
    );
    assert.equal(canvas.includes("studio-export-disabled"), false);
    assert.equal(canvas.includes("Regenerate"), false);

    const toolbar = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/platform-toolbar.tsx"
      ),
      "utf8"
    );
    assert.match(toolbar, /studio-format-tabs/);
    assert.match(toolbar, /format-tab-\$\{f\.id\}/);
    assert.match(toolbar, /YOUTUBE_SHORT_FORMAT/);
    assert.match(toolbar, /YOUTUBE_VIDEO_FORMAT/);
  });

  it("does not keep deleted legacy UI modules", () => {
    assert.equal(
      existsSync(
        path.join(root, "src/components/dashboard/content/hooks/use-content-studio.ts")
      ),
      false
    );
    assert.equal(
      existsSync(
        path.join(root, "src/components/dashboard/content/studio-channels.ts")
      ),
      false
    );
    assert.equal(
      existsSync(
        path.join(root, "src/components/dashboard/content/prompt-inspector")
      ),
      false
    );
  });

  it("wraps Content Studio in Suspense for useSearchParams", () => {
    const page = readFileSync(
      path.join(root, "src/app/(app)/content/page.tsx"),
      "utf8"
    );
    assert.match(page, /Suspense/);
    assert.match(page, /ContentStudio/);
  });

  it("exports only ContentStudio from the dashboard content barrel", () => {
    const barrel = readFileSync(
      path.join(root, "src/components/dashboard/content/index.ts"),
      "utf8"
    );
    assert.match(barrel, /ContentStudio/);
    assert.equal(barrel.includes("PromptInspector"), false);
  });

  it("persists Short edits via production PATCH (no sessionStorage save path)", () => {
    const hook = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/hooks/use-atom-content-studio.ts"
      ),
      "utf8"
    );
    assert.match(hook, /method:\s*["']PATCH["']/);
    assert.doesNotMatch(hook, /sessionStorage/);
  });

  it("Phase 3: Short Generated/Manual mode uses durable-edit fields only", () => {
    const hook = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/hooks/use-atom-content-studio.ts"
      ),
      "utf8"
    );
    const rail = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/prompt-rail.tsx"
      ),
      "utf8"
    );
    const shell = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/vision-shell.tsx"
      ),
      "utf8"
    );
    const preview = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/preview-canvas.tsx"
      ),
      "utf8"
    );
    const storyboard = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/storyboard.tsx"
      ),
      "utf8"
    );

    assert.match(hook, /StudioPromptMode/);
    assert.match(hook, /"generated"\s*\|\s*"manual"/);
    assert.match(hook, /resetToGenerated:\s*true/);
    assert.match(hook, /imagePrompt/);
    assert.match(hook, /voiceoverPrompt/);
    assert.match(hook, /script/);
    assert.doesNotMatch(hook, /sessionStorage/);
    assert.doesNotMatch(hook, /manual-prompt/);
    assert.doesNotMatch(hook, /@\/brain\/channels/);

    assert.match(rail, /studio-prompt-mode/);
    assert.match(rail, /studio-prompt-mode-generated/);
    assert.match(rail, /studio-prompt-mode-manual/);
    assert.match(rail, /Generated/);
    assert.match(rail, /Manual/);
    assert.match(rail, /readOnly=\{fieldsReadOnly\}/);

    assert.match(shell, /onPromptModeChange/);
    assert.match(shell, /formatId === "youtube_short"/);

    assert.match(preview, /studio-preview-image-prompt/);
    assert.match(preview, /studio-preview-voiceover-prompt/);
    assert.match(preview, /studio-preview-script/);
    assert.match(storyboard, /studio-storyboard-script/);
  });
});

describe("platform registry (canonical Studio formats)", () => {
  it("marks YouTube active with Short and Video", () => {
    const yt = PLATFORM_REGISTRY.find((p) => p.id === "youtube");
    assert.ok(yt);
    assert.equal(yt!.status, "active");
    assert.deepEqual(
      listActiveFormatsForPlatform("youtube").map((f) => f.id),
      ["youtube_short", "youtube_video"]
    );
    assert.deepEqual(defaultFormatIdsForYoutube(), [
      "youtube_short",
      "youtube_video",
    ]);
  });
});

describe("buildExternalVideoPrompt", () => {
  it("includes strategy + task for ChatGPT paste", () => {
    const text = buildExternalVideoPrompt({
      atom: {
        schemaVersion: "content-atom/2",
        atomId: "atom_test",
        companyId: "co",
        buildStatus: "complete",
        approvalStatus: "locked",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        lineage: {
          masterTitle: "Test Topic",
          angle: "myth_vs_reality",
          directionId: "dir_1",
          topicGenerationId: "tg_1",
        },
        kernel: {
          audience_problem: "Too many ideas",
          core_tension: "Scatter vs focus",
          central_claim: {
            meaning: "One narrative wins",
            canonical_wording: "One narrative wins",
          },
          belief_shift: { from: "more ideas", to: "one spine" },
          payoff: "Clear month",
          intended_action: "Lock a direction",
          hook_strategy: { opening_intent: "Name the tension" },
          proof_plan: { allowed_claims: [], forbidden_claims: [] },
          brand_placement: { mode: "soft", notes: "" },
          research_needs: [],
        },
        evidence: { admitted: [], rejected: [] },
        craft: { version: 1, clauses: [] },
        limitations: [],
      } as never,
      pkg: null,
      imagePrompt: "Opening frame",
      voiceoverPrompt: "Calm VO",
      script: "Hook line",
    });
    assert.match(text, /FORMAT:/);
    assert.match(text, /STRATEGY \(Content Atom/);
    assert.match(text, /Test Topic/);
    assert.match(text, /Opening frame/);
    assert.match(text, /TASK/);
    assert.match(text, /ChatGPT|short-form|YouTube/i);
  });
});
