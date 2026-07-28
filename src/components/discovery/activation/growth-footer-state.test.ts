import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { GrowthDirectionId } from "./types";
import {
  growthFooterRightKind,
  isUseDirectionDisabled,
  nextCommittedAfterSelect,
} from "./growth-footer-state";

const A: GrowthDirectionId = "confidence";
const B: GrowthDirectionId = "personalized_fit";

describe("growth footer commitment", () => {
  it("keeps Use this direction until selected equals committed", () => {
    assert.equal(
      growthFooterRightKind({ selected: undefined, committed: undefined }),
      "use-direction"
    );
    assert.equal(
      growthFooterRightKind({ selected: A, committed: undefined }),
      "use-direction"
    );
    assert.equal(
      growthFooterRightKind({ selected: A, committed: A }),
      "build"
    );
  });

  it("invalidates commit when selection changes", () => {
    assert.equal(nextCommittedAfterSelect(B, A), undefined);
    assert.equal(nextCommittedAfterSelect(A, A), A);
  });

  it("disables Use this direction with no selection", () => {
    assert.equal(isUseDirectionDisabled(undefined), true);
    assert.equal(isUseDirectionDisabled(A), false);
  });
});
