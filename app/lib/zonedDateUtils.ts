import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export interface LocalDateParts {
  year: number;
  month: number;
  day: number;
}

function pad(value: number, length = 2): string {
  return value.toString().padStart(length, "0");
}

function formatLocalDate(parts: LocalDateParts): string {
  return `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}`;
}

function toUtc(
  parts: LocalDateParts,
  timeZone: string,
  timeOverrides?: { hour?: number; minute?: number; second?: number; millisecond?: number },
): Date {
  const hour = timeOverrides?.hour ?? 0;
  const minute = timeOverrides?.minute ?? 0;
  const second = timeOverrides?.second ?? 0;
  const millisecond = timeOverrides?.millisecond ?? 0;

  const iso = `${formatLocalDate(parts)}T${pad(hour)}:${pad(minute)}:${pad(second)}.${pad(millisecond, 3)}`;
  return fromZonedTime(iso, timeZone);
}

export function getLocalDateParts(date: Date, timeZone: string): LocalDateParts {
  const isoDate = formatInTimeZone(date, timeZone, "yyyy-MM-dd");
  const [year, month, day] = isoDate.split("-").map((segment) => Number.parseInt(segment, 10));
  return { year, month, day };
}

export function getIsoWeekday(date: Date, timeZone: string): number {
  return Number.parseInt(formatInTimeZone(date, timeZone, "i"), 10);
}

export function shiftLocalDate(parts: LocalDateParts, days: number): LocalDateParts {
  const base = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  base.setUTCDate(base.getUTCDate() + days);
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  };
}

export function shiftLocalMonths(parts: LocalDateParts, months: number): LocalDateParts {
  const targetMonth = new Date(Date.UTC(parts.year, parts.month - 1 + months, 1));
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const clampedDay = Math.min(parts.day, lastDayOfTargetMonth);
  const result = new Date(
    Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), clampedDay),
  );
  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
  };
}

export function shiftLocalYears(parts: LocalDateParts, years: number): LocalDateParts {
  const base = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  base.setUTCFullYear(base.getUTCFullYear() + years);
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  };
}

export function startOfLocalDay(parts: LocalDateParts, timeZone: string): Date {
  return toUtc(parts, timeZone);
}

export function endOfLocalDay(parts: LocalDateParts, timeZone: string): Date {
  return toUtc(parts, timeZone, { hour: 23, minute: 59, second: 59, millisecond: 999 });
}

export function startOfLocalMonth(parts: LocalDateParts): LocalDateParts {
  return { year: parts.year, month: parts.month, day: 1 };
}

export function endOfLocalMonth(parts: LocalDateParts): LocalDateParts {
  const base = new Date(Date.UTC(parts.year, parts.month, 0));
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  };
}

export function startOfLocalQuarter(parts: LocalDateParts): LocalDateParts {
  const quarterIndex = Math.floor((parts.month - 1) / 3);
  return { year: parts.year, month: quarterIndex * 3 + 1, day: 1 };
}

export function endOfLocalQuarter(parts: LocalDateParts): LocalDateParts {
  const start = startOfLocalQuarter(parts);
  const base = new Date(Date.UTC(start.year, start.month + 2, 0));
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  };
}

export function startOfLocalYear(parts: LocalDateParts): LocalDateParts {
  return { year: parts.year, month: 1, day: 1 };
}

export function endOfLocalYear(parts: LocalDateParts): LocalDateParts {
  const base = new Date(Date.UTC(parts.year + 1, 0, 0));
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  };
}

