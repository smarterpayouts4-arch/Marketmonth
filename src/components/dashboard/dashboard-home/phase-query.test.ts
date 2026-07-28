import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MARKETING_TOPIC_HREF,
  STRATEGY_COMPAT_REDIRECT,
  parseDashboardPhaseParam,
} from "./phase-query";

describe("dashboard phase query", () => {
  it("defaults null phase to no override (dashboard uses marketing-topic)", () => {
    assert.equal(parseDashboardPhaseParam(null), null);
  });

  it("activates marketing-topic from ?phase=marketing-topic", () => {
    assert.equal(parseDashboardPhaseParam("marketing-topic"), "marketing-topic");
  });

  it("normalizes legacy ?phase=strategy to marketing-topic", () => {
    assert.equal(parseDashboardPhaseParam("strategy"), "marketing-topic");
  });

  it("normalizes invalid ?phase=learn to marketing-topic", () => {
    assert.equal(parseDashboardPhaseParam("learn"), "marketing-topic");
  });

  it("accepts content/review/results", () => {
    assert.equal(parseDashboardPhaseParam("content"), "content");
    assert.equal(parseDashboardPhaseParam("review"), "review");
    assert.equal(parseDashboardPhaseParam("results"), "results");
  });

  it("compatibility redirect targets marketing-topic", () => {
    assert.equal(MARKETING_TOPIC_HREF, "/dashboard?phase=marketing-topic");
    assert.equal(STRATEGY_COMPAT_REDIRECT, MARKETING_TOPIC_HREF);
  });
});
