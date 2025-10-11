import { formatInTimeZone } from "date-fns-tz";

import {
  DEFAULT_LOCALE_CODE,
  DEFAULT_TIMEZONE,
  getSupportedLocale,
} from "@/lib/datetime";

import {
  endOfLocalDay,
  endOfLocalMonth,
  endOfLocalQuarter,
  endOfLocalYear,
  getIsoWeekday,
  getLocalDateParts,
  shiftLocalDate,
  shiftLocalMonths,
  shiftLocalYears,
  startOfLocalDay,
  startOfLocalMonth,
  startOfLocalQuarter,
  startOfLocalYear,
} from "@/lib/zonedDateUtils";

function getZonedTodayParts(timeZone: string, now?: Date) {
  const reference = now ? new Date(now) : new Date();
  return getLocalDateParts(reference, timeZone);
}

function describeWeekday(reference: Date, timeZone: string): number {
  return getIsoWeekday(reference, timeZone);
}

export type DatePresetKey =
  | "today"
  | "yesterday"
  | "tomorrow"
  | "this_week"
  | "last_week"
  | "next_week"
  | "this_month"
  | "last_month"
  | "next_month"
  | "this_quarter"
  | "last_quarter"
  | "next_quarter"
  | "this_year"
  | "last_year"
  | "next_year";

export type RelativePresetKey =
  | "before_days"
  | "after_days"
  | "last_days"
  | "next_days";

export type DatePresetSelection =
  | { type: "preset"; key: DatePresetKey }
  | { type: "relative"; key: RelativePresetKey; amount: number };

export interface DateRangeResult {
  start?: Date;
  end?: Date;
}

export interface DescribeRangeOptions {
  timeZone?: string;
  locale?: string;
}

export interface CalculateRangeOptions {
  timeZone?: string;
  now?: Date;
}

function ensurePositiveInteger(value: number, fallback = 7): number {
  if (!Number.isFinite(value) || Number.isNaN(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}

function calculatePresetRange(
  key: DatePresetKey,
  options: CalculateRangeOptions = {},
): DateRangeResult {
  const timeZone = options.timeZone || DEFAULT_TIMEZONE;
  const base = options.now ? new Date(options.now) : new Date();
  const todayParts = getZonedTodayParts(timeZone, base);
  const isoWeekday = describeWeekday(base, timeZone);
  const startToday = startOfLocalDay(todayParts, timeZone);
  const endToday = endOfLocalDay(todayParts, timeZone);

  switch (key) {
    case "today": {
      return { start: startToday, end: endToday };
    }
    case "yesterday": {
      const referenceParts = shiftLocalDate(todayParts, -1);
      return {
        start: startOfLocalDay(referenceParts, timeZone),
        end: endOfLocalDay(referenceParts, timeZone),
      };
    }
    case "tomorrow": {
      const referenceParts = shiftLocalDate(todayParts, 1);
      return {
        start: startOfLocalDay(referenceParts, timeZone),
        end: endOfLocalDay(referenceParts, timeZone),
      };
    }
    case "this_week": {
      const startParts = shiftLocalDate(todayParts, 1 - isoWeekday);
      const endParts = shiftLocalDate(startParts, 6);
      return {
        start: startOfLocalDay(startParts, timeZone),
        end: endOfLocalDay(endParts, timeZone),
      };
    }
    case "last_week": {
      const thisWeekStart = shiftLocalDate(todayParts, 1 - isoWeekday);
      const startParts = shiftLocalDate(thisWeekStart, -7);
      const endParts = shiftLocalDate(thisWeekStart, -1);
      return {
        start: startOfLocalDay(startParts, timeZone),
        end: endOfLocalDay(endParts, timeZone),
      };
    }
    case "next_week": {
      const thisWeekStart = shiftLocalDate(todayParts, 1 - isoWeekday);
      const startParts = shiftLocalDate(thisWeekStart, 7);
      const endParts = shiftLocalDate(thisWeekStart, 13);
      return {
        start: startOfLocalDay(startParts, timeZone),
        end: endOfLocalDay(endParts, timeZone),
      };
    }
    case "this_month": {
      const startParts = startOfLocalMonth(todayParts);
      const endParts = endOfLocalMonth(startParts);
      return {
        start: startOfLocalDay(startParts, timeZone),
        end: endOfLocalDay(endParts, timeZone),
      };
    }
    case "last_month": {
      const currentMonthStart = startOfLocalMonth(todayParts);
      const startParts = shiftLocalMonths(currentMonthStart, -1);
      const endParts = endOfLocalMonth(startParts);
      return {
        start: startOfLocalDay(startParts, timeZone),
        end: endOfLocalDay(endParts, timeZone),
      };
    }
    case "next_month": {
      const currentMonthStart = startOfLocalMonth(todayParts);
      const startParts = shiftLocalMonths(currentMonthStart, 1);
      const endParts = endOfLocalMonth(startParts);
      return {
        start: startOfLocalDay(startParts, timeZone),
        end: endOfLocalDay(endParts, timeZone),
      };
    }
    case "this_quarter": {
      const startParts = startOfLocalQuarter(todayParts);
      const endParts = endOfLocalQuarter(startParts);
      return {
        start: startOfLocalDay(startParts, timeZone),
        end: endOfLocalDay(endParts, timeZone),
      };
    }
    case "last_quarter": {
      const thisQuarterStart = startOfLocalQuarter(todayParts);
      const startParts = shiftLocalMonths(thisQuarterStart, -3);
      const endParts = endOfLocalQuarter(startParts);
      return {
        start: startOfLocalDay(startParts, timeZone),
        end: endOfLocalDay(endParts, timeZone),
      };
    }
    case "next_quarter": {
      const thisQuarterStart = startOfLocalQuarter(todayParts);
      const startParts = shiftLocalMonths(thisQuarterStart, 3);
      const endParts = endOfLocalQuarter(startParts);
      return {
        start: startOfLocalDay(startParts, timeZone),
        end: endOfLocalDay(endParts, timeZone),
      };
    }
    case "this_year": {
      const startParts = startOfLocalYear(todayParts);
      const endParts = endOfLocalYear(startParts);
      return {
        start: startOfLocalDay(startParts, timeZone),
        end: endOfLocalDay(endParts, timeZone),
      };
    }
    case "last_year": {
      const thisYearStart = startOfLocalYear(todayParts);
      const startParts = shiftLocalYears(thisYearStart, -1);
      const endParts = endOfLocalYear(startParts);
      return {
        start: startOfLocalDay(startParts, timeZone),
        end: endOfLocalDay(endParts, timeZone),
      };
    }
    case "next_year": {
      const thisYearStart = startOfLocalYear(todayParts);
      const startParts = shiftLocalYears(thisYearStart, 1);
      const endParts = endOfLocalYear(startParts);
      return {
        start: startOfLocalDay(startParts, timeZone),
        end: endOfLocalDay(endParts, timeZone),
      };
    }
    default:
      return {};
  }
}

function calculateRelativeRange(
  key: RelativePresetKey,
  amount: number,
  options: CalculateRangeOptions = {},
): DateRangeResult {
  const timeZone = options.timeZone || DEFAULT_TIMEZONE;
  const safeAmount = ensurePositiveInteger(amount);
  const base = options.now ? new Date(options.now) : new Date();
  const todayParts = getZonedTodayParts(timeZone, base);

  switch (key) {
    case "before_days": {
      const referenceParts = shiftLocalDate(todayParts, -safeAmount);
      return {
        end: endOfLocalDay(referenceParts, timeZone),
      };
    }
    case "after_days": {
      const referenceParts = shiftLocalDate(todayParts, safeAmount);
      return {
        start: startOfLocalDay(referenceParts, timeZone),
      };
    }
    case "last_days": {
      const startReference = shiftLocalDate(todayParts, -(safeAmount - 1));
      return {
        start: startOfLocalDay(startReference, timeZone),
        end: endOfLocalDay(todayParts, timeZone),
      };
    }
    case "next_days": {
      const endReference = shiftLocalDate(todayParts, safeAmount - 1);
      return {
        start: startOfLocalDay(todayParts, timeZone),
        end: endOfLocalDay(endReference, timeZone),
      };
    }
    default:
      return {};
  }
}

export function calculateDateRange(
  selection: DatePresetSelection,
  options: CalculateRangeOptions = {},
): DateRangeResult {
  if (!selection) return {};
  if (selection.type === "preset") {
    return calculatePresetRange(selection.key, options);
  }
  return calculateRelativeRange(selection.key, selection.amount, options);
}

export interface DatePresetOption {
  key: DatePresetKey;
  label: string;
  group: "Quick" | "Week" | "Month" | "Quarter" | "Year";
}

export const DATE_PRESET_OPTIONS: DatePresetOption[] = [
  { key: "today", label: "Today", group: "Quick" },
  { key: "yesterday", label: "Yesterday", group: "Quick" },
  { key: "tomorrow", label: "Tomorrow", group: "Quick" },
  { key: "this_week", label: "This week", group: "Week" },
  { key: "last_week", label: "Last week", group: "Week" },
  { key: "next_week", label: "Next week", group: "Week" },
  { key: "this_month", label: "This month", group: "Month" },
  { key: "last_month", label: "Last month", group: "Month" },
  { key: "next_month", label: "Next month", group: "Month" },
  { key: "this_quarter", label: "This quarter", group: "Quarter" },
  { key: "last_quarter", label: "Last quarter", group: "Quarter" },
  { key: "next_quarter", label: "Next quarter", group: "Quarter" },
  { key: "this_year", label: "This year", group: "Year" },
  { key: "last_year", label: "Last year", group: "Year" },
  { key: "next_year", label: "Next year", group: "Year" },
];

export const RELATIVE_PRESET_OPTIONS: Array<{
  key: RelativePresetKey;
  label: string;
  description: string;
}> = [
  {
    key: "before_days",
    label: "Before X days",
    description: "Everything before the calendar day that is X days away.",
  },
  {
    key: "after_days",
    label: "After X days",
    description: "Everything after the calendar day that is X days away.",
  },
  {
    key: "last_days",
    label: "Within last X days",
    description: "From X days ago up to the end of today.",
  },
  {
    key: "next_days",
    label: "Within next X days",
    description: "From the start of today through the next X days.",
  },
];

export function describeRange(
  selection: DatePresetSelection,
  options: DescribeRangeOptions = {},
): string {
  if (!selection) return "";
  const timeZone = options.timeZone || DEFAULT_TIMEZONE;
  const locale = options.locale || DEFAULT_LOCALE_CODE;
  const { start, end } = calculateDateRange(selection, { timeZone });

  const formatter = (value?: Date) =>
    value
      ? formatInTimeZone(value, timeZone, "EEE, d MMM yyyy HH:mm zzz", {
          locale: getSupportedLocale(locale),
        })
      : undefined;

  const startFormatted = formatter(start);
  const endFormatted = formatter(end);

  if (selection.type === "preset") {
    if (startFormatted && endFormatted) {
      return `${startFormatted} → ${endFormatted}`;
    }
    return selection.key.replace(/_/g, " ");
  }

  switch (selection.key) {
    case "before_days":
      return endFormatted
        ? `Up to ${endFormatted} (${selection.amount} day${selection.amount === 1 ? "" : "s"} before today)`
        : "Before selected day";
    case "after_days":
      return startFormatted
        ? `From ${startFormatted} onwards (${selection.amount} day${selection.amount === 1 ? "" : "s"} after today)`
        : "After selected day";
    case "last_days":
      if (startFormatted && endFormatted) {
        return `${startFormatted} → ${endFormatted} (last ${selection.amount} day${selection.amount === 1 ? "" : "s"})`;
      }
      return `Last ${selection.amount} day${selection.amount === 1 ? "" : "s"}`;
    case "next_days":
      if (startFormatted && endFormatted) {
        return `${startFormatted} → ${endFormatted} (next ${selection.amount} day${selection.amount === 1 ? "" : "s"})`;
      }
      return `Next ${selection.amount} day${selection.amount === 1 ? "" : "s"}`;
    default:
      return "";
  }
}

export function getDefaultRelativeAmount(selection?: DatePresetSelection): number {
  if (selection?.type === "relative") {
    return ensurePositiveInteger(selection.amount);
  }
  return 7;
}

