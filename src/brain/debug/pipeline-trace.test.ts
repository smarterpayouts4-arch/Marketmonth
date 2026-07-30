import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

import {
  __pipelineTraceTestables,
  beginPipelineTrace,
  endPipelineTrace,
  getRejectionRollup,
  pipelineTrace,
  recordSubjectRejection,
  truncateTraceText,
} from "./pipeline-trace";

describe("pipeline-trace", () => {
  const prev = process.env.MM_PIPELINE_TRACE;

  beforeEach(() => {
    __pipelineTraceTestables.reset();
    delete process.env.MM_PIPELINE_TRACE;
  });

  afterEach(() => {
    __pipelineTraceTestables.reset();
    if (prev === undefined) delete process.env.MM_PIPELINE_TRACE;
    else process.env.MM_PIPELINE_TRACE = prev;
  });

  it("is silent when MM_PIPELINE_TRACE is unset", () => {
    const logs: string[] = [];
    const orig = console.info;
    console.info = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    try {
      beginPipelineTrace("zynava.com");
      pipelineTrace("company.load", { company: "zynava.com" }, "ok");
      endPipelineTrace();
      assert.equal(logs.length, 0);
    } finally {
      console.info = orig;
    }
  });

  it("emits terminal stages and rejection rollup when enabled", () => {
    process.env.MM_PIPELINE_TRACE = "1";
    const logs: string[] = [];
    const capture = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    const origInfo = console.info;
    const origWarn = console.warn;
    const origErr = console.error;
    console.info = capture;
    console.warn = capture;
    console.error = capture;
    try {
      beginPipelineTrace("clearflowplumbing.example");
      recordSubjectRejection("multi_item_catalog");
      pipelineTrace("subject.malformed", { reason: "multi_item_catalog" }, "fail");
      assert.equal(getRejectionRollup().multi_item_catalog, 1);
      endPipelineTrace();
      assert.ok(logs.some((l) => l.includes("MM PIPELINE TRACE")));
      assert.ok(logs.some((l) => l.includes("pipeline.end")));
      assert.ok(logs.some((l) => l.includes("rejection_rollup")));
    } finally {
      console.info = origInfo;
      console.warn = origWarn;
      console.error = origErr;
    }
  });

  it("truncates long evidence text", () => {
    const long = "a".repeat(400);
    const t = truncateTraceText(long, 160);
    assert.ok(t.length < 200);
    assert.match(t, /\(\+240\)$/);
  });
});
