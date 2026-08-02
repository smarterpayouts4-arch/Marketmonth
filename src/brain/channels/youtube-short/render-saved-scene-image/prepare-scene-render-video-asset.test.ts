import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../.."
);

describe("prepareSceneRender video assetType unlock", () => {
  it("allows image and video asset types for still generation", () => {
    const prepare = readFileSync(
      path.join(
        root,
        "src/brain/channels/youtube-short/render-saved-scene-image/prepare-scene-render.ts"
      ),
      "utf8"
    );
    const hook = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/hooks/use-atom-content-studio/use-studio-edit-actions/use-scene-image-render.ts"
      ),
      "utf8"
    );
    const panel = readFileSync(
      path.join(
        root,
        "src/components/dashboard/content/studio/prompt-rail/scene-asset-panel.tsx"
      ),
      "utf8"
    );

    assert.match(prepare, /assetType !== "image" && assetType !== "video"/);
    assert.doesNotMatch(
      hook,
      /Only image asset scenes can be prepared in this phase/
    );
    assert.doesNotMatch(
      panel,
      /Only image asset scenes can be prepared in this phase/
    );
  });
});
