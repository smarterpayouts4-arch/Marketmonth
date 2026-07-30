import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { approveAtom, deriveLimitations, lockAtom } from "@/brain/atom";
import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import { runCoreContentBrain } from "@/brain/pipeline";

import { youtubeShortAdapter } from "./adapters/youtube-short-adapter";
import { youtubeVideoAdapter } from "./adapters/youtube-video-adapter";
import {
  buildIdempotencyKey,
  evidenceRefsFromAtom,
  resolvePackageStatus,
} from "./adapters/types";
import {
  PLATFORM_REGISTRY,
  YOUTUBE_SHORT_FORMAT,
  YOUTUBE_VIDEO_FORMAT,
  defaultFormatIdsForYoutube,
  listActiveFormatsForPlatform,
} from "./platform-registry";

function loadFixtureContext() {
  const text = readFileSync(
    path.join(process.cwd(), "data/companies/zynava.com/approved.csv"),
    "utf8"
  );
  const context = parseFixtureCsv(text);
  assert.ok(context);
  return context;
}

const sampleSelected = {
  masterTopic: {
    id: "master_test",
    source: "automatic" as const,
    punchline: "How to make clearer marketing decisions with Zynava",
    subheading: "Umbrella",
    rationale: "From fixture",
    evidenceIds: [] as string[],
    confidence: "high" as const,
    safety: { status: "safe" as const, reasons: [] as string[] },
  },
  variation: {
    id: "var_decision",
    angle: "decision_guide" as const,
    punchline: "Decide what to say this month without drowning in ideas",
    subheading: "Decision support",
    brief: "Help operators pick one direction first.",
    audienceProblem: "Too many disconnected content ideas",
    strategicPurpose: "Position as decision partner",
    evidenceIds: [] as string[],
    assumptionIds: [] as string[],
    confidence: "high" as const,
    safety: { status: "safe" as const, reasons: [] as string[] },
  },
};

async function lockedAtomFromFixture() {
  const context = loadFixtureContext();
  const brain = await runCoreContentBrain({
    context,
    preferLlm: false,
    selected: sampleSelected,
  });
  assert.equal(brain.ok, true);
  if (!brain.ok) throw new Error("brain failed");
  const limitations = deriveLimitations(brain.atom, null);
  const approved = approveAtom(brain.atom, {
    limitationsAcknowledgement:
      brain.atom.buildStatus === "limited"
        ? {
            acknowledgedAt: new Date().toISOString(),
            limitations:
              limitations.length > 0
                ? limitations
                : ["limited atom acknowledged for adapter test"],
          }
        : undefined,
  });
  assert.equal(approved.ok, true, approved.ok ? "" : approved.error);
  if (!approved.ok) throw new Error("approve failed");
  const locked = lockAtom(approved.atom);
  assert.equal(locked.ok, true);
  if (!locked.ok) throw new Error("lock failed");
  return locked.atom;
}

describe("platform / format registry", () => {
  it("marks YouTube active with Short and Video formats", () => {
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

  it("keeps other platforms coming soon with no active formats", () => {
    for (const id of [
      "instagram",
      "tiktok",
      "linkedin",
      "facebook",
      "x",
    ] as const) {
      const p = PLATFORM_REGISTRY.find((x) => x.id === id);
      assert.ok(p);
      assert.equal(p!.status, "coming_soon");
      assert.equal(listActiveFormatsForPlatform(id).length, 0);
    }
  });

  it("defaults Short to 9:16 and Video to 16:9", () => {
    assert.deepEqual(YOUTUBE_SHORT_FORMAT.supportedAspectRatios, ["9:16"]);
    assert.deepEqual(YOUTUBE_VIDEO_FORMAT.supportedAspectRatios, ["16:9"]);
  });
});

describe("YouTube Short + Video adapters", () => {
  it("produces distinct scripts, aspect ratios, and scene counts from one atom", async () => {
    const atom = await lockedAtomFromFixture();
    const inputBase = {
      atom,
      validationReport: null,
      atomRevision: 1,
      buildKey: "test-build-key",
      forceRegenerate: true,
    };

    const short = await youtubeShortAdapter.produce({
      ...inputBase,
      format: YOUTUBE_SHORT_FORMAT,
    });
    const video = await youtubeVideoAdapter.produce({
      ...inputBase,
      format: YOUTUBE_VIDEO_FORMAT,
    });

    assert.equal(short.formatId, "youtube_short");
    assert.equal(video.formatId, "youtube_video");
    assert.equal(short.aspectRatio, "9:16");
    assert.equal(video.aspectRatio, "16:9");
    assert.equal(short.atomRevision, video.atomRevision);
    assert.notEqual(short.script, video.script);
    assert.ok(video.chapters.length >= 2);
    assert.ok(video.scenes.length > short.scenes.length);
    assert.ok(video.durationSeconds > short.durationSeconds);

    const shortOk = youtubeShortAdapter.validate(short, {
      ...inputBase,
      format: YOUTUBE_SHORT_FORMAT,
    });
    const videoOk = youtubeVideoAdapter.validate(video, {
      ...inputBase,
      format: YOUTUBE_VIDEO_FORMAT,
    });
    assert.equal(shortOk.ok, true);
    assert.equal(videoOk.ok, true);
  });

  it("does not invent evidence refs outside the atom claim/proof set", async () => {
    const atom = await lockedAtomFromFixture();
    const allowed = new Set(evidenceRefsFromAtom(atom));
    const short = await youtubeShortAdapter.produce({
      atom,
      validationReport: null,
      atomRevision: 1,
      buildKey: "k",
      format: YOUTUBE_SHORT_FORMAT,
    });
    for (const id of short.evidenceRefs) {
      assert.ok(allowed.has(id), `unexpected evidence ref ${id}`);
    }
  });

  it("marks research_required for limited atoms with unresolved research", () => {
    assert.equal(
      resolvePackageStatus(
        {
          buildStatus: "limited",
          missing_information: ["Need dosage clarity"],
        } as never,
        ["Need dosage clarity"]
      ),
      "research_required"
    );
  });
});

describe("idempotency key", () => {
  it("includes atomId, revision, format, adapter, and template versions", () => {
    const a = buildIdempotencyKey({
      atomId: "atom_1",
      atomRevision: 2,
      formatId: "youtube_short",
      adapterVersion: "a1",
      templateVersion: "t1",
    });
    const b = buildIdempotencyKey({
      atomId: "atom_1",
      atomRevision: 2,
      formatId: "youtube_short",
      adapterVersion: "a1",
      templateVersion: "t1",
    });
    const c = buildIdempotencyKey({
      atomId: "atom_1",
      atomRevision: 3,
      formatId: "youtube_short",
      adapterVersion: "a1",
      templateVersion: "t1",
    });
    assert.equal(a, b);
    assert.notEqual(a, c);
  });
});
