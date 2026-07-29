import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  dayPrefixedItem,
  formatWeekRange,
  getNextMonthSchedule,
} from "./schedule";

function localDate(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

describe("getNextMonthSchedule", () => {
  it("Jul 28 2026 → August with Aug 3–9 / 10–16 / 17–23 / 24–30", () => {
    const schedule = getNextMonthSchedule(localDate(2026, 6, 28));
    assert.equal(schedule.monthName, "August");
    assert.equal(schedule.monthSlug, "august");
    assert.equal(schedule.year, 2026);
    assert.equal(schedule.kickoffLabel, "Mon, Aug 3");
    assert.deepEqual(
      schedule.weeks.map((w) => w.rangeLabel),
      ["Aug 3–9", "Aug 10–16", "Aug 17–23", "Aug 24–30"]
    );
  });

  it("Dec 15 2026 → January 2027 rollover", () => {
    const schedule = getNextMonthSchedule(localDate(2026, 11, 15));
    assert.equal(schedule.monthName, "January");
    assert.equal(schedule.year, 2027);
    assert.equal(schedule.kickoffLabel, "Mon, Jan 4");
    assert.equal(schedule.weeks[0]?.rangeLabel, "Jan 4–10");
  });

  it("month whose 1st is a Monday → week 1 starts on the 1st", () => {
    // June 1 2026 is a Monday; from May 15 → next month is June
    const schedule = getNextMonthSchedule(localDate(2026, 4, 15));
    assert.equal(schedule.monthName, "June");
    assert.equal(schedule.weeks[0]?.rangeLabel, "Jun 1–7");
    assert.equal(schedule.kickoffLabel, "Mon, Jun 1");
  });
});

describe("formatWeekRange", () => {
  it("formats same-month ranges without repeating the month", () => {
    assert.equal(
      formatWeekRange(localDate(2026, 7, 3), localDate(2026, 7, 9)),
      "Aug 3–9"
    );
  });

  it("formats cross-month ranges with both month names", () => {
    assert.equal(
      formatWeekRange(localDate(2026, 7, 31), localDate(2026, 8, 6)),
      "Aug 31–Sep 6"
    );
  });
});

describe("dayPrefixedItem", () => {
  it("maps items to Mon / Wed / Fri", () => {
    assert.equal(dayPrefixedItem("Latte art reel", 0), "Mon · Latte art reel");
    assert.equal(dayPrefixedItem("Morning rush hook", 1), "Wed · Morning rush hook");
    assert.equal(dayPrefixedItem("Bean origin teaser", 2), "Fri · Bean origin teaser");
  });
});
