"use client";

import { useSearchParams } from "next/navigation";

import { ContentEmptyState } from "./content-empty-state";
import { ContentErrorState } from "./content-error-state";
import { useAtomContentStudio } from "./hooks/use-atom-content-studio";
import { VisionContentStudioShell } from "./studio/vision-shell";

/**
 * Atom deep-link Studio: /content?atomId=…
 * Precedence: atomId wins. Strategy is already on the atom — open via
 * “Strategy behind this content” (no Marketing Topic phase chrome).
 */
function AtomDeepLinkStudio({ atomId }: { atomId: string }) {
  const atomStudio = useAtomContentStudio(atomId);

  if (
    atomStudio.atomState.status === "idle" ||
    atomStudio.atomState.status === "loading"
  ) {
    return (
      <div
        className="flex h-full min-h-[50vh] items-center justify-center"
        data-studio-shell
        data-testid="content-studio-atom-loading"
      >
        <p className="text-sm text-text-secondary" aria-live="polite">
          Loading Content Studio…
        </p>
      </div>
    );
  }

  if (atomStudio.atomState.status === "error") {
    return (
      <div
        className="w-full py-6"
        data-studio-shell
        data-testid="content-studio-atom-error"
      >
        <ContentErrorState
          message={atomStudio.atomState.error}
          onRetry={() => {
            void atomStudio.reloadAtom();
          }}
        />
      </div>
    );
  }

  const { atom, validation, recordRevision } = atomStudio.atomState;
  const productionLocked = atom.approvalStatus === "locked";
  const bundle =
    atomStudio.bundleState.status === "ready"
      ? atomStudio.bundleState.bundle
      : null;
  const warnings =
    atomStudio.bundleState.status === "ready"
      ? atomStudio.bundleState.warnings
      : [];
  const bundleError =
    atomStudio.bundleState.status === "error"
      ? atomStudio.bundleState.error
      : null;

  /* Single data-studio-shell lives on VisionContentStudioShell — AppShell keys off it. */
  return (
    <VisionContentStudioShell
      atom={atom}
      validation={validation}
      recordRevision={recordRevision}
      bundle={bundle}
      bundleLoading={atomStudio.bundleState.status === "loading"}
      bundleError={bundleError}
      warnings={warnings}
      platform={atomStudio.platform}
      onPlatformChange={atomStudio.setPlatform}
      formatId={atomStudio.formatId}
      onFormatChange={atomStudio.setFormatId}
      packages={atomStudio.packages}
      activePackage={atomStudio.activePackage}
      selectedSceneId={atomStudio.selectedSceneId}
      onSelectScene={atomStudio.setSelectedSceneId}
      promptMode={atomStudio.promptMode}
      onPromptModeChange={atomStudio.setPromptMode}
      sceneEdits={atomStudio.selectedSceneEdits}
      onSceneVisualPromptChange={(v) =>
        atomStudio.setSceneEditField("visualPrompt", v)
      }
      onSceneNarrationChange={(v) =>
        atomStudio.setSceneEditField("narration", v)
      }
      onSceneOnScreenTextChange={(v) =>
        atomStudio.setSceneEditField("onScreenText", v)
      }
      onSceneAssetTypeChange={(v) =>
        atomStudio.setSceneEditField("assetType", v)
      }
      onResetScene={atomStudio.resetSelectedScene}
      onRemoveScene={atomStudio.removeSelectedScene}
      onAddScene={atomStudio.addScene}
      globalVisualStyle={atomStudio.edits.globalVisualStyle}
      onGlobalVisualStyleChange={(v) =>
        atomStudio.setEditField("globalVisualStyle", v)
      }
      onPastePromptFill={atomStudio.ingestScenePrompt}
      onStartFromGenerated={atomStudio.startFromGeneratedScene}
      onValidateImageRender={atomStudio.validateImageRender}
      ingestBusy={atomStudio.ingestBusy}
      ingestError={atomStudio.ingestError}
      renderBusy={atomStudio.renderBusy}
      renderMessage={atomStudio.renderMessage}
      renderError={atomStudio.renderError}
      imagePrompt={atomStudio.edits.imagePrompt}
      voiceoverPrompt={atomStudio.edits.voiceoverPrompt}
      script={atomStudio.edits.script}
      onImagePromptChange={(v) => atomStudio.setEditField("imagePrompt", v)}
      onVoiceoverPromptChange={(v) =>
        atomStudio.setEditField("voiceoverPrompt", v)
      }
      onScriptChange={(v) => atomStudio.setEditField("script", v)}
      dirty={atomStudio.dirty}
      saveLabel={atomStudio.saveLabel}
      onSave={atomStudio.saveEdits}
      onReset={atomStudio.resetEdits}
      onRegenerate={() => atomStudio.regenerate()}
      productionLocked={productionLocked}
    />
  );
}

export function ContentStudio() {
  const searchParams = useSearchParams();
  const atomIdParam = searchParams.get("atomId")?.trim() || null;

  // atomId deep link wins — no dashboard phase chrome on this path.
  if (atomIdParam) {
    return <AtomDeepLinkStudio atomId={atomIdParam} />;
  }

  return (
    <div className="w-full py-6" data-testid="content-studio-empty">
      <ContentEmptyState />
    </div>
  );
}
