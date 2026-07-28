import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isAllowedContextFilename } from "@/brain/content/extra-context";

import {
  EXTRA_CONTEXT_MAX_CHARS,
  buildExtraContextPayload,
  canSubmitWithContext,
  combinedContextLength,
  emptyExtraContextUi,
} from "./extra-context-client";

describe("marketing topic extra context client", () => {
  it("builds paste-only, file-only, and combined payloads", () => {
    const paste = {
      ...emptyExtraContextUi(),
      pastedText: "hello notes",
    };
    assert.deepEqual(buildExtraContextPayload(paste), {
      text: "hello notes",
      source: "pasted",
    });

    const filesOnly = {
      ...emptyExtraContextUi(),
      files: [
        {
          id: "1",
          name: "brief.md",
          text: "file body",
          sizeBytes: 9,
        },
      ],
    };
    const filePayload = buildExtraContextPayload(filesOnly);
    assert.equal(filePayload?.source, "uploaded_file");
    assert.deepEqual(filePayload?.filenames, ["brief.md"]);

    const combined = {
      pastedText: "paste",
      files: filesOnly.files,
      error: null,
    };
    assert.equal(buildExtraContextPayload(combined)?.source, "combined");
  });

  it("blocks submit when combined length exceeds max (no silent truncate)", () => {
    const state = {
      pastedText: "x".repeat(EXTRA_CONTEXT_MAX_CHARS + 10),
      files: [] as [],
      error: null,
    };
    const gate = canSubmitWithContext(state);
    assert.equal(gate.ok, false);
    assert.ok(gate.error?.includes("exceeds"));
    assert.equal(combinedContextLength(state), EXTRA_CONTEXT_MAX_CHARS + 10);
  });

  it("allows only .txt and .md", () => {
    assert.equal(isAllowedContextFilename("notes.txt"), true);
    assert.equal(isAllowedContextFilename("notes.md"), true);
    assert.equal(isAllowedContextFilename("deck.pdf"), false);
    assert.equal(isAllowedContextFilename("doc.docx"), false);
    assert.equal(isAllowedContextFilename("x.html"), false);
  });

  it("starts collapsed-friendly empty and clears to empty", () => {
    const empty = emptyExtraContextUi();
    assert.equal(empty.pastedText, "");
    assert.equal(empty.files.length, 0);
    assert.equal(empty.error, null);
    assert.equal(buildExtraContextPayload(empty), null);
  });
});
