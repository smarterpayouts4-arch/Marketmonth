import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { FORMATS } from "./formats";

const landingRoot = path.join(process.cwd(), "src/components/landing");
function read(relativeToLanding: string): string {
  return readFileSync(path.join(landingRoot, relativeToLanding), "utf8");
}

describe("Content Flow — data model", () => {
  it("has exactly five formats", () => {
    assert.equal(FORMATS.length, 5);
  });

  it("does not include a sixth format", () => {
    assert.equal(
      FORMATS.some((format) => /instagram|tiktok|youtube|linkedin|seo/.test(format.id) === false),
      false
    );
  });

  it("sequence numbers run 1 through 5 in order, matching array order", () => {
    assert.deepEqual(
      FORMATS.map((format) => format.sequence),
      [1, 2, 3, 4, 5]
    );
  });

  it("labels and illustrative metrics match the approved reference", () => {
    assert.deepEqual(
      FORMATS.map((format) => [format.label, format.metric, format.metricLabel]),
      [
        ["Instagram Post", "128K", "Views"],
        ["TikTok Video", "215K", "Views"],
        ["YouTube Short", "96.2K", "Views"],
        ["LinkedIn Post", "41.6K", "Followers"],
        ["SEO Article", "18.6K", "Reads"],
      ]
    );
  });

  it("every format id is unique", () => {
    const ids = FORMATS.map((format) => format.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});

describe("Content Flow — section renders the approved copy", () => {
  const source = read("content-universe/index.tsx");

  it("renders the section with the headline", () => {
    assert.match(source, /<section/);
    assert.match(source, /One Strategy Topic\. Multiple Content Formats\./);
  });

  it("renders the illustrative-example disclaimer", () => {
    assert.match(source, /Illustrative example/);
  });

  it("renders a live-status badge", () => {
    assert.match(source, /Live content flow/i);
    assert.match(source, /LiveDot/);
  });
});

describe("Content Flow — cards are data-driven, never hardcoded", () => {
  const visual = read("content-universe-visual.tsx");
  const card = read("content-format-card.tsx");

  it("renders cards via FORMATS.map, once for the grid and once for the mobile row", () => {
    const matches = visual.match(/FORMATS\.map/g) ?? [];
    assert.equal(matches.length, 2);
  });

  it("never hardcodes an individual <ContentFormatCard> instance outside a map", () => {
    const matches = visual.match(/<ContentFormatCard/g) ?? [];
    assert.equal(matches.length, 2);
  });

  it("the card component takes its content from a ContentFormat prop, not literals", () => {
    assert.match(card, /format: ContentFormat/);
    assert.equal(/Instagram Post|TikTok Video|128K/.test(card), false);
  });

  it("renders the strategy card's live-distribution status", () => {
    assert.match(visual, /LIVE: Distributing now/);
    assert.match(visual, /Live distribution across all channels/);
    assert.match(visual, /Updates in real time/);
  });
});

describe("Content Flow — connectors are decorative and reduced-motion aware", () => {
  const connectors = read("content-universe/connectors.tsx");
  const visual = read("content-universe-visual.tsx");
  const css = readFileSync(
    path.join(process.cwd(), "src/app/globals.css"),
    "utf8"
  );

  it("hides the distribution-network SVG from assistive technology", () => {
    assert.match(connectors, /aria-hidden="true"/);
  });

  it("hides the simplified mobile connector from assistive technology", () => {
    const mobileBlock = visual.slice(visual.indexOf("md:hidden"));
    assert.match(mobileBlock, /aria-hidden="true"/);
  });

  it("branch positions are derived from the same grid-column-center formula the CSS grid uses, not hand-guessed pixels", () => {
    assert.match(connectors, /gridColumnCenterFraction/);
  });

  it("the grid gap and the connector math share one gap-fraction constant", () => {
    const visual = read("content-universe-visual.tsx");
    assert.match(visual, /gap-\[1\.8%\]/);
    const formats = read("content-universe/formats.ts");
    assert.match(formats, /GRID_GAP_FRACTION = 0\.018/);
  });

  it("gates SMIL traveling particles behind the reduced-motion preference", () => {
    assert.match(connectors, /usePrefersReducedMotion/);
    assert.match(connectors, /!reducedMotion &&/);
  });

  it("globals.css disables the new content-flow keyframe animations under prefers-reduced-motion", () => {
    const reduceBlock = css.slice(
      css.indexOf("@media (prefers-reduced-motion: reduce)"),
      css.indexOf("@media (prefers-reduced-motion: reduce)") + 600
    );
    assert.match(reduceBlock, /\.content-flow-dash/);
    assert.match(reduceBlock, /\.content-flow-ring/);
    assert.match(reduceBlock, /\.content-flow-node/);
  });
});

describe("Content Flow — superseded implementation was removed, not duplicated", () => {
  it("the count-up hook no longer exists (static illustrative metrics replaced it)", () => {
    assert.equal(
      existsSync(path.join(landingRoot, "content-universe/use-count-up.ts")),
      false
    );
  });

  it("the card no longer imports the count-up hook or the old formatMetric helper", () => {
    const card = read("content-format-card.tsx");
    assert.equal(/useCountUp|formatMetric/.test(card), false);
  });

  it("month-plan's local channel-icons file was removed in favor of the shared social icons", () => {
    assert.equal(
      existsSync(path.join(landingRoot, "month-plan/channel-icons.tsx")),
      false
    );
    const executionBadge = read("month-plan/execution-badge.tsx");
    assert.equal(/from ["']\.\/channel-icons["']/.test(executionBadge), false);
    assert.match(executionBadge, /from ["']\.\.\/social-icons["']/);
  });

  it("no leftover .cu-tree rules remain in globals.css", () => {
    const css = readFileSync(
      path.join(process.cwd(), "src/app/globals.css"),
      "utf8"
    );
    assert.equal(/cu-tree|cu-node-in|cu-views-pulse/.test(css), false);
  });
});

describe("Content Flow — still wired into the landing page", () => {
  it("ContentUniverseSection is still imported by the landing composition", () => {
    const landingIndex = read("index.tsx");
    assert.match(landingIndex, /ContentUniverseSection/);
  });
});
