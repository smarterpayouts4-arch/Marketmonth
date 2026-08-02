import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  PLATFORM_REGISTRY,
  defaultFormatIdsForYoutube,
  listActiveFormatsForPlatform,
} from "@/brain/content-studio";

import { buildExternalVideoPrompt } from "./studio/build-external-prompt";

const root = process.cwd();

/** Concatenate .ts/.tsx files in a folder (non-recursive) for structural asserts. */
function readFolderSurface(dir: string): string {
  return readdirSync(dir)
    .filter((name) => /\.(ts|tsx)$/.test(name) && !name.includes(".test."))
    .sort()
    .map((name) => readFileSync(path.join(dir, name), "utf8"))
    .join("\n");
}

/** Concatenate studio hook modules so structural asserts survive folder splits. */
function readStudioHookSurface(): string {
  const dir = path.join(
    root,
    "src/components/dashboard/content/hooks/use-atom-content-studio"
  );
  const editActions = readFolderSurface(
    path.join(dir, "use-studio-edit-actions")
  );
  const topLevel = [
    "use-atom-content-studio.ts",
    "use-studio-bundle.ts",
    "studio-scene-actions.ts",
    "seed-short-editors.ts",
    "package-edit-helpers.ts",
    "types.ts",
  ]
    .map((name) => readFileSync(path.join(dir, name), "utf8"))
    .join("\n");
  return `${topLevel}\n${editActions}`;
}

/** Concatenate vision-shell folder so structural asserts survive the split. */
function readVisionShellSurface(): string {
  return readFolderSurface(
    path.join(root, "src/components/dashboard/content/studio/vision-shell")
  );
}

/** Orchestra + sibling folder for scene-asset-panel thin-split. */
function readSceneAssetPanelSurface(): string {
  const orchestra = readFileSync(
    path.join(
      root,
      "src/components/dashboard/content/studio/prompt-rail/scene-asset-panel.tsx"
    ),
    "utf8"
  );
  const folder = readFolderSurface(
    path.join(
      root,
      "src/components/dashboard/content/studio/prompt-rail/scene-asset-panel"
    )
  );
  return `${orchestra}\n${folder}`;
}

/** Orchestra + sibling folder for studio-production-api thin-split. */
function readStudioProductionApiSurface(): string {
  const dir = path.join(
    root,
    "src/components/dashboard/content/hooks/use-atom-content-studio"
  );
  const orchestra = readFileSync(
    path.join(dir, "studio-production-api.ts"),
    "utf8"
  );
  const folder = readFolderSurface(path.join(dir, "studio-production-api"));
  return `${orchestra}\n${folder}`;
}

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
    const shell = readVisionShellSurface();
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
    assert.match(shell, /studio-export-controls|studio-export-disabled|Assemble Final Short/);
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
        "src/components/dashboard/content/hooks/use-atom-content-studio/use-atom-content-studio.ts"
      ),
      "utf8"
    );
    const api = readStudioProductionApiSurface();
    assert.match(api, /method:\s*["']PATCH["']/);
    assert.doesNotMatch(hook, /sessionStorage/);
    assert.doesNotMatch(api, /sessionStorage/);
  });

  it("Phase 3: Short Generated/Manual mode uses durable-edit fields only", () => {
    const hook = readStudioHookSurface();
    const types = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/hooks/use-atom-content-studio/types.ts"
      ),
      "utf8"
    );
    const api = readStudioProductionApiSurface();
    const rail = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/prompt-rail/studio-prompt-rail.tsx"
      ),
      "utf8"
    );
    const modeToggle = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/prompt-rail/prompt-mode-toggle.tsx"
      ),
      "utf8"
    );
    const shell = readVisionShellSurface();
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

    assert.match(types, /StudioPromptMode/);
    assert.match(types, /"generated"\s*\|\s*"manual"/);
    assert.match(api, /resetToGenerated:\s*true/);
    assert.match(hook, /imagePrompt/);
    assert.match(hook, /voiceoverPrompt/);
    assert.match(hook, /script/);
    assert.doesNotMatch(hook, /sessionStorage/);
    assert.doesNotMatch(hook, /manual-prompt/);
    assert.doesNotMatch(hook, /@\/brain\/channels/);

    assert.match(modeToggle, /studio-prompt-mode/);
    assert.match(modeToggle, /studio-prompt-mode-generated/);
    assert.match(modeToggle, /studio-prompt-mode-manual/);
    assert.match(modeToggle, /Generated/);
    assert.match(modeToggle, /Manual/);
    assert.match(rail, /readOnly=\{fieldsReadOnly\}/);

    assert.match(shell, /onPromptModeChange/);
    assert.match(shell, /formatId === "youtube_short"/);

    assert.match(preview, /studio-preview-image-prompt/);
    assert.match(preview, /studio-preview-voiceover-prompt/);
    assert.match(preview, /studio-preview-script/);
    assert.match(preview, /studio-preview-zoom/);
    assert.match(preview, /studio-preview-zoom-dialog/);
    /* Checkpoint B: onScreenText DOM overlay over assetUrl (live Manual draft).
     * Class/testid live in preview-onscreen-overlay.tsx; canvas must host the component. */
    assert.match(preview, /SceneOnScreenOverlay/);
    assert.match(preview, /preview-onscreen-overlay/);
    assert.match(preview, /overlayTextTrimmed/);
    assert.match(preview, /const overlayText =/);
    assert.match(preview, /sceneEdits\?\.onScreenText/);
    assert.match(storyboard, /studio-storyboard-script/);
  });

  it("Phase 3B: scene-level durable editor wired on Short prompt rail", () => {
    const hook = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/hooks/use-atom-content-studio/use-atom-content-studio.ts"
      ),
      "utf8"
    );
    const helpers = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/hooks/use-atom-content-studio/package-edit-helpers.ts"
      ),
      "utf8"
    );
    const api = readStudioProductionApiSurface();
    const rail = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/prompt-rail/studio-prompt-rail.tsx"
      ),
      "utf8"
    );
    const sceneEditor = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/prompt-rail/scene-editor.tsx"
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

    assert.match(api, /resetSceneId/);
    assert.match(hook, /setSceneEditField/);
    assert.match(helpers, /buildScenePatches/);
    assert.match(rail, /SceneEditor/);
    assert.match(sceneEditor, /studio-scene-editor/);
    assert.match(sceneEditor, /studio-reset-scene/);
    assert.match(sceneEditor, /studio-scene-asset-type/);
    assert.match(sceneEditor, /visualPrompt/);
    assert.match(sceneEditor, /narration/);
    assert.match(sceneEditor, /onScreenText/);
    assert.match(storyboard, /onScreenText/);
  });

  it("Phase 3C: Manual mode is a one-scene workspace with paste-prompt ingest", () => {
    const hook = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/hooks/use-atom-content-studio/use-atom-content-studio.ts"
      ),
      "utf8"
    );
    const api = readStudioProductionApiSurface();
    const rail = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/prompt-rail/studio-prompt-rail.tsx"
      ),
      "utf8"
    );
    const sceneEditor = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/prompt-rail/scene-editor.tsx"
      ),
      "utf8"
    );
    const pasteSheet = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/prompt-rail/paste-prompt-sheet.tsx"
      ),
      "utf8"
    );
    const ingestRoute = readFileSync(
      path.join(
        root,
        "src/app/api/brain/content/production/ingest-scene-prompt/route.ts"
      ),
      "utf8"
    );
    const ingestService = readFileSync(
      path.join(
        root,
        "src/brain/channels/youtube-short/ingest-scene-prompt.ts"
      ),
      "utf8"
    );

    assert.match(hook, /ingestScenePrompt/);
    assert.match(api, /ingest-scene-prompt/);
    assert.match(hook, /sceneEditsById/);
    assert.match(hook, /startFromGeneratedScene/);
    assert.doesNotMatch(hook, /from ["']@\/brain\/llm\/openai-client/);
    assert.doesNotMatch(hook, /sessionStorage/);
    assert.doesNotMatch(api, /sessionStorage/);

    assert.match(rail, /isManualWorkspace/);
    assert.match(rail, /!isManualWorkspace && pkg\.status === "research_required"/);
    assert.match(rail, /manualWorkspace=\{isManualWorkspace\}/);
    assert.match(rail, /Visual metaphor/);
    assert.match(rail, /VO \/ voiceover/);
    assert.match(rail, /Content \/ script/);

    assert.match(sceneEditor, /studio-paste-prompt/);
    assert.match(sceneEditor, /SceneAssetPanel/);
    assert.match(sceneEditor, /Scene \$\{sceneIndex\} of \$\{sceneCount\}/);
    const sceneAssetPanel = readSceneAssetPanelSurface();
    assert.match(sceneAssetPanel, /studio-generate-image-shell/);
    assert.match(sceneAssetPanel, /Generate Image/);
    assert.match(sceneAssetPanel, /Regenerate Image/);
    assert.match(sceneAssetPanel, /Motion Prompt/);
    assert.match(sceneAssetPanel, /studio-motion-prompt-field/);
    assert.match(
      sceneAssetPanel,
      /Add and save Motion Prompt instructions before generating video\./
    );
    assert.match(
      sceneAssetPanel,
      /Describe what the subject does during this video/
    );
    assert.doesNotMatch(sceneAssetPanel, /Optional Veo/);
    // Layout: Asset Type toggle → Motion Prompt → Generate Video
    const assetVideoBtn = sceneAssetPanel.indexOf("studio-scene-asset-video");
    const motionField = sceneAssetPanel.indexOf("studio-motion-prompt-field");
    const generateVideo = sceneAssetPanel.indexOf("studio-generate-video");
    assert.ok(assetVideoBtn >= 0 && motionField > assetVideoBtn);
    assert.ok(generateVideo > motionField);
    assert.match(sceneAssetPanel, /showMotionPrompt/);
    assert.match(sceneAssetPanel, /assetType === "video"/);
    assert.match(sceneAssetPanel, /Voiceover/);
    assert.match(sceneAssetPanel, /Final Scene Video/);
    assert.match(sceneAssetPanel, /Create Scene MP4/);
    assert.doesNotMatch(sceneAssetPanel, /studio-scene-image-thumb/);
    assert.doesNotMatch(
      sceneAssetPanel,
      /The image used as the visual foundation for this scene/
    );

    assert.match(pasteSheet, /Fill Scene/);
    assert.match(pasteSheet, /studio-paste-prompt-textarea/);
    assert.match(pasteSheet, /Motion Prompt/);
    assert.match(pasteSheet, /nothing is\s+generated until you Save Scene/i);

    assert.match(ingestRoute, /requireApiSession/);
    assert.match(ingestRoute, /requireCompanyAccess/);
    assert.match(ingestRoute, /ingestYouTubeShortScenePrompt/);
    assert.doesNotMatch(ingestRoute, /patchYouTubeShortDurableEdits/);

    assert.match(ingestService, /callBrainLlm/);
    assert.match(ingestService, /shortScenePromptIngest/);
    assert.match(ingestService, /youtubeShortSceneIngestExtractSchema/);
    assert.doesNotMatch(ingestService, /saveProductionBundle/);
    assert.doesNotMatch(ingestService, /patchYouTubeShortDurableEdits/);
  });

  it("Phase 3D: durable scene structure + global style + lint-safe hook (backend retained)", () => {
    const hook = readStudioHookSurface();
    const api = readStudioProductionApiSurface();
    const rail = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/prompt-rail/studio-prompt-rail.tsx"
      ),
      "utf8"
    );
    const globalStyle = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/prompt-rail/global-visual-style.tsx"
      ),
      "utf8"
    );
    const studio = readFileSync(
      path.join(root, "src/components/dashboard/content/content-studio.tsx"),
      "utf8"
    );
    const patch = readFileSync(
      path.join(
        root,
        "src/brain/channels/youtube-short/patch-durable-edits.ts"
      ),
      "utf8"
    );
    const compose = readFileSync(
      path.join(
        root,
        "src/brain/channels/youtube-short/compose-effective-image-prompt.ts"
      ),
      "utf8"
    );
    const sceneStructure = readFileSync(
      path.join(root, "src/brain/channels/youtube-short/scene-structure.ts"),
      "utf8"
    );

    assert.match(hook, /applySceneCount/);
    assert.match(hook, /addScene/);
    assert.match(hook, /removeSelectedScene/);
    assert.match(hook, /globalVisualStyle/);
    assert.match(hook, /sceneStructure/);
    // Derived idle/loading — no sync loading setState in Effects; no timer evasion.
    assert.doesNotMatch(hook, /setTimeout\s*\(\s*(?:\(\)\s*=>|function)/);
    assert.doesNotMatch(hook, /queueMicrotask/);
    assert.doesNotMatch(hook, /await Promise\.resolve\(\)/);
    assert.doesNotMatch(hook, /eslint-disable/);
    assert.match(hook, /Derive atom UI state/);
    assert.match(hook, /Derive bundle UI state/);
    assert.match(hook, /seedShortEditors/);

    assert.match(api, /sceneStructure/);
    assert.match(api, /globalVisualStyle/);
    assert.match(patch, /sceneStructure/);
    assert.match(patch, /applyShortSceneStructureAction/);
    assert.match(sceneStructure, /increaseShortSceneCount/);
    assert.match(sceneStructure, /setCount/);

    assert.match(rail, /GlobalVisualStyleField/);
    assert.match(globalStyle, /studio-global-visual-style-input/);
    assert.match(studio, /globalVisualStyle/);
    assert.match(compose, /composeEffectiveImagePrompt/);
    assert.doesNotMatch(compose, /gemini|imagekit|json2video/i);

    // UI must not import channels (constants come from content-studio barrel).
    assert.doesNotMatch(rail, /@\/brain\/channels/);
  });

  it("Phase 3E: Manual rail drops scene-count clutter; storyboard owns Add/Remove", () => {
    const rail = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/prompt-rail/studio-prompt-rail.tsx"
      ),
      "utf8"
    );
    const sceneEditor = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/prompt-rail/scene-editor.tsx"
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
    const shell = readVisionShellSurface();
    const studio = readFileSync(
      path.join(root, "src/components/dashboard/content/content-studio.tsx"),
      "utf8"
    );
    const css = readFileSync(
      path.join(root, "src/styles/content-studio.css"),
      "utf8"
    );

    // Rail: no scene-count presets / Apply / Add / Remove
    assert.doesNotMatch(rail, /SceneSetup/);
    assert.doesNotMatch(rail, /studio-scene-count/);
    assert.doesNotMatch(rail, /onApplySceneCount/);
    assert.doesNotMatch(rail, /onAddScene/);
    assert.doesNotMatch(rail, /onRemoveScene/);
    assert.doesNotMatch(sceneEditor, /studio-remove-scene/);
    assert.doesNotMatch(sceneEditor, /Remove Scene/);
    assert.match(rail, /GlobalVisualStyleField/);
    assert.match(sceneEditor, /studio-paste-prompt/);
    assert.match(sceneEditor, /studio-reset-scene/);

    // Storyboard header owns Add / Remove Selected (both prompt modes — not Manual-only)
    assert.match(storyboard, /studio-storyboard-actions/);
    assert.match(storyboard, /studio-add-scene/);
    assert.match(storyboard, /studio-remove-selected/);
    assert.match(storyboard, /studio-remove-scene-confirm/);
    assert.match(storyboard, /studio-storyboard-min-scenes-hint/);
    assert.match(storyboard, /Add Scene/);
    assert.match(storyboard, /Remove Selected/);
    assert.doesNotMatch(
      storyboard,
      /promptMode === "manual" &&\s*Boolean\(onAddScene\)/
    );
    assert.match(storyboard, /data-selected=\{selected \? "true" : "false"\}/);
    assert.match(storyboard, /aria-pressed=\{selected\}/);
    assert.match(shell, /onRemoveSelectedScene/);
    assert.match(shell, /onAddScene/);
    assert.doesNotMatch(studio, /onApplySceneCount/);
    assert.match(
      readFileSync(
        path.join(
          root,
          "src/components/dashboard/content/studio/prompt-rail/prompt-rail-actions.tsx"
        ),
        "utf8"
      ),
      /Reset to generated/
    );
    assert.match(
      readFileSync(
        path.join(
          root,
          "src/components/dashboard/content/studio/prompt-rail/prompt-rail-actions.tsx"
        ),
        "utf8"
      ),
      /studio-save-status/
    );
    assert.match(
      readFileSync(
        path.join(
          root,
          "src/components/dashboard/content/studio/prompt-rail/prompt-rail-actions.tsx"
        ),
        "utf8"
      ),
      /Unsaved changes/
    );
    assert.match(studio, /onClearSceneVoice/);
    assert.match(readSceneAssetPanelSurface(), /studio-clear-voice/);

    // ~15% shorter Short cards + clearer selection + no vertical scroll on track
    assert.match(css, /4\.45rem/);
    assert.match(css, /6\.375rem/);
    assert.match(
      css,
      /\.studio-storyboard__card\[data-selected="true"\]/
    );
    assert.match(css, /border-width: 2px/);
    assert.match(css, /overflow-y: hidden/);
    assert.match(css, /flex: 0 0 auto/);
  });

  it("Phase 3C: UI does not import OpenAI client or renderer", () => {
    const uiRoot = path.join(root, "src/components/dashboard/content");
    function walk(dir: string, out: string[] = []): string[] {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (/\.(ts|tsx)$/.test(name) && !name.includes(".test.")) {
          out.push(full);
        }
      }
      return out;
    }
    for (const file of walk(uiRoot)) {
      const src = readFileSync(file, "utf8");
      assert.doesNotMatch(
        src,
        /@\/brain\/llm\/openai-client/,
        `${file} must not import openai-client`
      );
      assert.doesNotMatch(
        src,
        /ShortRenderInput|json2video|imagekit/i,
        `${file} must not import renderer bridge`
      );
      assert.doesNotMatch(
        src,
        /@\/brain\/render/,
        `${file} must not import shared renderer`
      );
    }
  });

  it("Phase 4A: dry-run render path is API → channel; UI stays presentation-only", () => {
    const hook = readStudioHookSurface();
    const api = readStudioProductionApiSurface();
    const sceneEditor = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/prompt-rail/scene-editor.tsx"
      ),
      "utf8"
    );
    const sceneAssetPanel = readSceneAssetPanelSurface();
    const route = readFileSync(
      path.join(
        root,
        "src/app/api/brain/content/production/render-scene-image/route.ts"
      ),
      "utf8"
    );
    const renderMedia = readFileSync(
      path.join(root, "src/brain/render/render-media.ts"),
      "utf8"
    );

    assert.match(hook, /validateImageRender/);
    assert.match(hook, /generateCompleteScene/);
    assert.match(api, /render-scene-image/);
    assert.match(api, /renderSavedSceneImageRequest/);
    assert.match(sceneEditor, /SceneAssetPanel/);
    assert.match(sceneAssetPanel, /Generate Image/);
    assert.match(sceneAssetPanel, /Regenerate Image/);
    assert.match(sceneAssetPanel, /Generate Complete Scene/);
    assert.match(sceneAssetPanel, /studio-generate-complete-scene/);
    assert.match(sceneAssetPanel, /studio-full-generate-stepper/);
    assert.doesNotMatch(
      sceneAssetPanel,
      /Only image asset scenes can be prepared in this phase/
    );
    assert.match(sceneAssetPanel, /Save this scene before generating its image/);
    assert.match(sceneAssetPanel, /dirty/);

    assert.match(route, /requireApiSession/);
    assert.match(route, /requireCompanyAccess/);
    assert.match(route, /renderYouTubeShortSavedSceneImage/);
    assert.doesNotMatch(route, /createLiveImageAdapter|createDryRunAdapter/);
    assert.doesNotMatch(route, /from ["']@\/brain\/render["']/);
    assert.doesNotMatch(route, /@google\/genai|@imagekit\/nodejs/);
    assert.doesNotMatch(route, /composeShortSceneEffectiveImagePrompt/);
    assert.doesNotMatch(route, /saveProductionBundle/);

    assert.doesNotMatch(renderMedia, /bundle-store|youtube-short/);
    assert.doesNotMatch(hook, /from ["']@\/brain\/render/);
    assert.doesNotMatch(api, /from ["']@\/brain\/render/);
    assert.doesNotMatch(hook, /@google\/genai|@imagekit\/nodejs/);
  });

  it("composed MP4 plays inside the vertical preview frame, not a full-width sibling", () => {
    const preview = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/preview-canvas.tsx"
      ),
      "utf8"
    );
    const workspace = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/vision-shell/youtube-workspace.tsx"
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
    const css = readFileSync(
      path.join(root, "src/styles/content-studio.css"),
      "utf8"
    );

    assert.match(preview, /studio-preview-composed-video/);
    assert.match(preview, /showingComposed/);
    assert.match(preview, /object-contain/);
    assert.match(preview, /data-media=/);
    // Must not recreate a full-width landscape player under the frame.
    assert.doesNotMatch(preview, /studio-preview-composed-player/);
    assert.doesNotMatch(
      preview,
      /className="w-full rounded-md bg-black"/
    );
    // Storyboard ownership stays on the workspace, once (import + JSX).
    assert.doesNotMatch(preview, /StudioStoryboard|studio-storyboard/);
    assert.match(workspace, /<StudioStoryboard[\s\n]/);
    assert.equal(
      (workspace.match(/<StudioStoryboard[\s\n]/g) ?? []).length,
      1
    );
    assert.match(storyboard, /data-testid="studio-storyboard"/);
    assert.match(css, /\.studio-preview-frame--short/);
    assert.match(css, /aspect-ratio:\s*9\s*\/\s*16/);
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
