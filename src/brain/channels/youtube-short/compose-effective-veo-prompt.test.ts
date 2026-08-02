import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { composeEffectiveVeoPrompt } from "./compose-effective-veo-prompt";

describe("composeEffectiveVeoPrompt", () => {
  it("leads with motionPrompt and does not dump the full still essay", () => {
    const motion =
      "She opens the bottle, lifts the glass, drinks, and settles calmly.";
    const visual =
      "Premium photorealistic vertical 9:16 editorial wellness lifestyle image set in a cozy upscale bedroom with many more photography details ".repeat(
        8
      );
    const out = composeEffectiveVeoPrompt({
      motionPrompt: motion,
      visualPrompt: visual,
    });
    assert.ok(out.startsWith(motion));
    assert.match(out, /Preserve identity/i);
    assert.match(out, /left/i);
    assert.ok(out.length < visual.length);
    assert.doesNotMatch(out, /Premium photorealistic[\s\S]{400}/);
  });
});
