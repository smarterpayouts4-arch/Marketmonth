import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { augustMonthPlan } from "./data";
import {
  ALL_SOCIAL_CHANNELS,
  formatChannelNames,
  resolveSelectedWeekIndex,
  weekAutoIndexFromVisibleWeeks,
  weekChannelsCovered,
  weekExecutionCount,
  weekPlannedCount,
  weekProgressPercent,
  weekStatusBreakdown,
  type SocialChannel,
} from "./types";

const root = path.join(process.cwd(), "src/components/landing/month-plan");
function read(name: string): string {
  return readFileSync(path.join(root, name), "utf8");
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

describe("Month Plan - information architecture", () => {
  it("has exactly four strategic weeks", () => {
    assert.equal(augustMonthPlan.length, 4);
  });

  it("does not include a fifth week", () => {
    assert.equal(
      augustMonthPlan.some((week) => /week\s*5/i.test(week.label)),
      false
    );
  });

  it("every week has exactly five daily ideas, Monday–Friday in order", () => {
    for (const week of augustMonthPlan) {
      assert.equal(week.posts.length, 5, `${week.label} should have 5 ideas`);
      assert.deepEqual(
        week.posts.map((post) => post.day),
        WEEKDAYS,
        `${week.label} should cover Monday–Friday in order`
      );
    }
  });

  it("every idea has a non-empty title and description", () => {
    for (const week of augustMonthPlan) {
      for (const post of week.posts) {
        assert.ok(post.title.trim().length > 0, `${post.id} missing title`);
        assert.ok(
          post.description.trim().length > 0,
          `${post.id} missing description`
        );
      }
    }
  });
});

describe("Month Plan - hierarchy: idea → channel executions", () => {
  it("every idea has between 1 and 3 channel executions (never all five)", () => {
    for (const week of augustMonthPlan) {
      for (const post of week.posts) {
        assert.ok(
          post.executions.length >= 1 && post.executions.length <= 3,
          `${post.id} should have 1-3 executions, has ${post.executions.length}`
        );
      }
    }
  });

  it("no idea uses all five channels at once", () => {
    for (const week of augustMonthPlan) {
      for (const post of week.posts) {
        assert.notEqual(
          post.executions.length,
          ALL_SOCIAL_CHANNELS.length,
          `${post.id} should not use all five channels on one idea`
        );
      }
    }
  });

  it("every execution pairs a real channel with a real format (channel + format shown together)", () => {
    const validFormats = ["carousel", "reel", "short", "video", "post"];
    for (const week of augustMonthPlan) {
      for (const post of week.posts) {
        for (const execution of post.executions) {
          assert.ok(
            (ALL_SOCIAL_CHANNELS as string[]).includes(execution.channel),
            `${post.id} has an unsupported channel: ${execution.channel}`
          );
          assert.ok(
            validFormats.includes(execution.format),
            `${post.id} has an unsupported format: ${execution.format}`
          );
        }
      }
    }
  });

  it("an idea's executions never repeat the same channel twice", () => {
    for (const week of augustMonthPlan) {
      for (const post of week.posts) {
        const channels = post.executions.map((e) => e.channel);
        assert.equal(
          new Set(channels).size,
          channels.length,
          `${post.id} repeats a channel across executions`
        );
      }
    }
  });

  it("every week collectively covers all five channels across its five ideas", () => {
    for (const week of augustMonthPlan) {
      const covered = weekChannelsCovered(week);
      assert.deepEqual(
        new Set(covered),
        new Set(ALL_SOCIAL_CHANNELS as SocialChannel[]),
        `${week.label} should cover all five channels across its ideas`
      );
    }
  });

  it("weekExecutionCount sums executions across all ideas in the week", () => {
    assert.equal(weekExecutionCount(augustMonthPlan[0]!), 11);
    assert.equal(weekExecutionCount(augustMonthPlan[1]!), 11);
    assert.equal(weekExecutionCount(augustMonthPlan[2]!), 11);
    assert.equal(weekExecutionCount(augustMonthPlan[3]!), 12);
  });

  it("formatChannelNames joins channel labels in natural language", () => {
    assert.equal(formatChannelNames(["facebook"]), "Facebook");
    assert.equal(
      formatChannelNames(["facebook", "instagram"]),
      "Facebook and Instagram"
    );
    assert.equal(
      formatChannelNames(["facebook", "instagram", "youtube"]),
      "Facebook, Instagram and YouTube"
    );
  });

  it("source: no component infers a channel or format from the day name", () => {
    const daily = read("daily-content-card.tsx");
    const week = read("week-roadmap.tsx");
    const execution = read("execution-badge.tsx");
    for (const source of [daily, week, execution]) {
      assert.equal(/if\s*\(.*day.*===.*(Monday|Tuesday)/i.test(source), false);
      assert.equal(/\.getDay\(|case\s*["'](Monday|Tuesday)/i.test(source), false);
    }
  });

  it("source: ExecutionList renders one badge per execution with no hardcoded platform", () => {
    const source = read("execution-badge.tsx");
    assert.match(source, /executions\.map/);
  });
});

describe("Month Plan - no duplicate imagery within a week", () => {
  it("every daily idea within a week has its own unique image, distinct from every other idea and from the week's hero", () => {
    for (const week of augustMonthPlan) {
      const images = [week.heroImageSrc, ...week.posts.map((p) => p.imageSrc)];
      const nonNull = images.filter((src): src is string => src !== null);
      assert.equal(
        new Set(nonNull).size,
        nonNull.length,
        `${week.label} reuses an image across its hero or daily ideas`
      );
    }
  });

  it("no image is reused across different weeks", () => {
    const allImages = augustMonthPlan.flatMap((week) => [
      week.heroImageSrc,
      ...week.posts.map((p) => p.imageSrc),
    ]);
    const nonNull = allImages.filter((src): src is string => src !== null);
    assert.equal(
      new Set(nonNull).size,
      nonNull.length,
      "an image path is reused across weeks"
    );
  });
});

describe("Month Plan - progress derived from data", () => {
  it("computes plannedCount from posts, matching the approved demo numbers", () => {
    assert.equal(weekPlannedCount(augustMonthPlan[0]!), 3);
    assert.equal(weekPlannedCount(augustMonthPlan[1]!), 2);
    assert.equal(weekPlannedCount(augustMonthPlan[2]!), 1);
    assert.equal(weekPlannedCount(augustMonthPlan[3]!), 0);
  });

  it("computes progress percentage from plannedCount / totalCount", () => {
    assert.equal(weekProgressPercent(augustMonthPlan[0]!), 60);
    assert.equal(weekProgressPercent(augustMonthPlan[1]!), 40);
    assert.equal(weekProgressPercent(augustMonthPlan[2]!), 20);
    assert.equal(weekProgressPercent(augustMonthPlan[3]!), 0);
  });

  it("never divides by zero", () => {
    const empty = { ...augustMonthPlan[0]!, totalCount: 0, posts: [] };
    assert.equal(weekProgressPercent(empty), 0);
  });

  it("status breakdown counts planned/scheduled/published independently", () => {
    const breakdown = weekStatusBreakdown(augustMonthPlan[0]!);
    assert.equal(breakdown.planned, 3);
    assert.equal(breakdown.scheduled, 1);
    assert.equal(breakdown.published, 0);
  });
});

describe("Month Plan - image alt text", () => {
  it("every week hero and every daily idea has non-empty alt text", () => {
    for (const week of augustMonthPlan) {
      assert.ok(week.heroImageAlt.trim().length > 0, `${week.id} missing heroImageAlt`);
      for (const post of week.posts) {
        assert.ok(post.imageAlt.trim().length > 0, `${post.id} missing imageAlt`);
      }
    }
  });

  it("placeholder image renders the alt text as its accessible name", () => {
    const source = read("month-plan-image.tsx");
    assert.match(source, /role="img"/);
    assert.match(source, /aria-label=\{alt\}/);
  });
});

describe("Month Plan - week selection", () => {
  it("defaults to week 1 selected before the timer has revealed any weeks", () => {
    assert.equal(weekAutoIndexFromVisibleWeeks(0, 4), 0);
  });

  it("auto-advances as visibleWeeks increases, clamped to the last week", () => {
    assert.equal(weekAutoIndexFromVisibleWeeks(2, 4), 1);
    assert.equal(weekAutoIndexFromVisibleWeeks(4, 4), 3);
    assert.equal(weekAutoIndexFromVisibleWeeks(99, 4), 3);
  });

  it("manual week selection overrides auto-advance until cleared", () => {
    assert.equal(resolveSelectedWeekIndex(2, 0), 2);
    assert.equal(resolveSelectedWeekIndex(null, 1), 1);
  });

  it("source: week roadmap cards are real buttons with role=tab and aria-selected wired to state", () => {
    const source = read("week-roadmap.tsx");
    assert.match(source, /role="tab"/);
    assert.match(source, /aria-selected=\{selected\}/);
    assert.match(source, /<button/);
  });
});

describe("Month Plan - status legend uses the real status model", () => {
  it("legend lists all five ContentStatus values from STATUS_METADATA, not a hardcoded caption", () => {
    const source = read("status-legend.tsx");
    assert.match(source, /STATUS_METADATA/);
    assert.match(source, /"planned"/);
    assert.match(source, /"scheduled"/);
    assert.match(source, /"published"/);
    assert.match(source, /"draft"/);
    assert.match(source, /"empty"/);
  });
});

describe("Month Plan - intro header is merged into the same outer card as the roadmap", () => {
  it("month-plan.tsx renders the intro header as the first child inside its outer rounded shell, not a separate standalone block", () => {
    const source = read("month-plan.tsx");
    assert.match(source, /<MonthPlanIntroHeader/);
    const outerOpenIndex = source.indexOf('rounded-[1.2rem]');
    const introIndex = source.indexOf("<MonthPlanIntroHeader");
    const roadmapHeadingIndex = source.indexOf("Example August Marketing Month");
    assert.ok(outerOpenIndex > -1 && introIndex > -1 && roadmapHeadingIndex > -1);
    assert.ok(
      outerOpenIndex < introIndex && introIndex < roadmapHeadingIndex,
      "intro header must sit inside the outer shell, above the roadmap heading"
    );
  });

  it("intro header carries the approved illustrative eyebrow and shared copy fields", () => {
    const source = read("intro-header.tsx");
    assert.match(source, /monthPlanEyebrow/);
    assert.match(source, /monthPlanHeadline/);
    assert.match(source, /monthPlanBody/);
    assert.equal(/What you actually get|ready to publish/i.test(source), false);
  });

  it("intro header uses existing brand tokens, not a parallel design system", () => {
    const source = read("intro-header.tsx");
    assert.match(source, /bg-primary\/5/);
    assert.doesNotMatch(source, /#[0-9a-fA-F]{3,6}/);
  });

  it("the old decorative orbit illustration no longer exists and is not imported anywhere", () => {
    const introHeaderSource = read("intro-header.tsx");
    assert.equal(/IntroIllustration/.test(introHeaderSource), false);
    assert.equal(
      existsSync(path.join(root, "intro-illustration.tsx")),
      false
    );
  });

  it("the 'at a glance' stat card derives Weeks and Channels from real data, not hardcoded numbers", () => {
    const source = read("intro-header.tsx");
    assert.match(source, /augustMonthPlan\.length/);
    assert.match(source, /ALL_SOCIAL_CHANNELS\.length/);
  });

  it("the old standalone TheaterIntro block no longer exists and is not imported anywhere", () => {
    const demoTheaterSource = read("../demo-theater.tsx");
    assert.equal(/TheaterIntro/.test(demoTheaterSource), false);
    assert.equal(
      existsSync(path.join(root, "../demo-theater/intro.tsx")),
      false
    );
  });
});

describe("Month Plan - connecting sentence and week summary are data-derived", () => {
  it("source: daily grid computes idea/execution counts from the week, not hardcoded numbers", () => {
    const source = read("daily-content-grid.tsx");
    assert.match(source, /weekExecutionCount/);
    assert.match(source, /week\.posts\.length/);
  });

  it("source: week detail panel computes ideas/executions/channels-covered from the week", () => {
    const source = read("week-detail-panel.tsx");
    assert.match(source, /weekExecutionCount/);
    assert.match(source, /weekChannelsCovered/);
    assert.match(source, /formatChannelNames/);
  });
});
