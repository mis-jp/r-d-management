import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";

export const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
] as const;

export type RangeKey = (typeof RANGE_OPTIONS)[number]["value"];

export type DateRange = {
  key: RangeKey;
  label: string;
  /** `null` means unbounded (all time). */
  start: Date | null;
  end: Date;
};

export function resolveRange(value: string | undefined, fallback: RangeKey = "30d", now = new Date()): DateRange {
  const option = RANGE_OPTIONS.find((o) => o.value === value) ?? RANGE_OPTIONS.find((o) => o.value === fallback)!;
  const end = endOfDay(now);
  switch (option.value) {
    case "7d":
      return { key: option.value, label: option.label, start: startOfDay(subDays(now, 6)), end };
    case "30d":
      return { key: option.value, label: option.label, start: startOfDay(subDays(now, 29)), end };
    case "90d":
      return { key: option.value, label: option.label, start: startOfDay(subDays(now, 89)), end };
    case "month":
      return { key: option.value, label: option.label, start: startOfMonth(now), end };
    case "last-month": {
      const prev = subMonths(now, 1);
      return { key: option.value, label: option.label, start: startOfMonth(prev), end: endOfMonth(prev) };
    }
    case "year":
      return { key: option.value, label: option.label, start: startOfYear(now), end };
    case "all":
      return { key: option.value, label: option.label, start: null, end };
  }
}

export type Bucket = { label: string; start: Date; end: Date };

/** Splits a range into day, week or month buckets depending on its length. */
export function buildBuckets(start: Date, end: Date): Bucket[] {
  const days = differenceInCalendarDays(end, start) + 1;
  const buckets: Bucket[] = [];
  if (days <= 31) {
    for (let d = startOfDay(start); d <= end; d = addDays(d, 1)) {
      buckets.push({ label: format(d, "MMM d"), start: d, end: endOfDay(d) });
    }
  } else if (days <= 120) {
    for (let d = startOfWeek(start, { weekStartsOn: 1 }); d <= end; d = addWeeks(d, 1)) {
      buckets.push({ label: `Wk of ${format(d, "MMM d")}`, start: d, end: endOfDay(addDays(d, 6)) });
    }
  } else {
    for (let d = startOfMonth(start); d <= end; d = addMonths(d, 1)) {
      buckets.push({ label: format(d, "MMM yyyy"), start: d, end: endOfMonth(d) });
    }
  }
  return buckets;
}
