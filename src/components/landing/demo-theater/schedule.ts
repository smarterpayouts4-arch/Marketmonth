/** Day labels for the three content chips in each week card. */
export const WEEK_ITEM_DAYS = ["Mon", "Wed", "Fri"] as const;

export type ScheduleWeek = {
  index: number;
  rangeLabel: string;
  startDate: Date;
};

export type MonthSchedule = {
  monthName: string;
  monthSlug: string;
  year: number;
  weeks: ScheduleWeek[];
  /** e.g. "Mon, Aug 3" — UI prefixes "Kicks off". */
  kickoffLabel: string;
};

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function atLocalMidnight(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day, 0, 0, 0, 0);
}

/** Monday = 0 … Sunday = 6 (ISO-style). */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** First Monday on or after the 1st of the given calendar month. */
function firstMondayOfMonth(year: number, monthIndex: number): Date {
  const first = atLocalMidnight(year, monthIndex, 1);
  const offset = (7 - mondayIndex(first)) % 7;
  return atLocalMidnight(year, monthIndex, 1 + offset);
}

function addDays(date: Date, days: number): Date {
  return atLocalMidnight(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days
  );
}

/** `Aug 3–9`, or `Aug 31–Sep 6` when the range crosses a month. */
export function formatWeekRange(start: Date, end: Date): string {
  const startShort = MONTH_SHORT[start.getMonth()];
  const endShort = MONTH_SHORT[end.getMonth()];
  if (start.getMonth() === end.getMonth()) {
    return `${startShort} ${start.getDate()}–${end.getDate()}`;
  }
  return `${startShort} ${start.getDate()}–${endShort} ${end.getDate()}`;
}

function formatKickoff(start: Date): string {
  const short = MONTH_SHORT[start.getMonth()];
  return `Mon, ${short} ${start.getDate()}`;
}

/**
 * Build a 4-week Monday-start schedule for the calendar month after `today`.
 * Leftover days after week 4 are intentionally omitted.
 */
export function getNextMonthSchedule(today: Date = new Date()): MonthSchedule {
  const nextMonthIndex = today.getMonth() + 1;
  const year =
    nextMonthIndex > 11 ? today.getFullYear() + 1 : today.getFullYear();
  const monthIndex = nextMonthIndex % 12;

  const week1Start = firstMondayOfMonth(year, monthIndex);
  const weeks: ScheduleWeek[] = Array.from({ length: 4 }, (_, index) => {
    const startDate = addDays(week1Start, index * 7);
    const endDate = addDays(startDate, 6);
    return {
      index,
      rangeLabel: formatWeekRange(startDate, endDate),
      startDate,
    };
  });

  return {
    monthName: MONTH_LONG[monthIndex],
    monthSlug: MONTH_LONG[monthIndex].toLowerCase(),
    year,
    weeks,
    kickoffLabel: formatKickoff(week1Start),
  };
}

/** Prefix a week item with its scheduled day, e.g. "Mon · Latte art reel". */
export function dayPrefixedItem(item: string, itemIndex: number): string {
  const day = WEEK_ITEM_DAYS[itemIndex] ?? WEEK_ITEM_DAYS[0];
  return `${day} · ${item}`;
}
