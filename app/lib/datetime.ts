import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { isSameDay } from "date-fns";
import type { Locale } from "date-fns";
import { enAU, enGB, enNZ } from "date-fns/locale";

type DateInput = Date | string | number;

type LocaleInput = string | Locale | null | undefined;

const DEFAULT_TIME_ZONE = "Europe/London";
const DEFAULT_LOCALE = enGB;

const LOCALE_MAP: Record<string, Locale> = {
  "en": enGB,
  "en-gb": enGB,
  "en-gb-u-ca-gregory": enGB,
  "en-au": enAU,
  "en-nz": enNZ,
};

function toDate(value: DateInput): Date {
  if (value instanceof Date) {
    return value;
  }

  return new Date(value);
}

function resolveLocale(locale: LocaleInput): Locale {
  if (!locale) {
    return DEFAULT_LOCALE;
  }

  if (typeof locale !== "string") {
    return locale;
  }

  return LOCALE_MAP[locale.toLowerCase()] ?? DEFAULT_LOCALE;
}

export function convertUTCToTimeZone(
  value: DateInput,
  timeZone: string = DEFAULT_TIME_ZONE,
): Date {
  return toZonedTime(toDate(value), timeZone);
}

export function utcToZonedTime(
  value: DateInput,
  timeZone: string = DEFAULT_TIME_ZONE,
): Date {
  return convertUTCToTimeZone(value, timeZone);
}

export function formatInTenantTimeZone(
  value: DateInput,
  timeZone: string = DEFAULT_TIME_ZONE,
  formatString: string = "dd MMM yyyy",
  locale?: LocaleInput,
): string {
  return formatInTimeZone(toDate(value), timeZone, formatString, {
    locale: resolveLocale(locale),
  });
}

export function formatTimeInTenantTimeZone(
  value: DateInput,
  timeZone: string = DEFAULT_TIME_ZONE,
  locale?: LocaleInput,
): string {
  return formatInTenantTimeZone(value, timeZone, "HH:mm", locale);
}

export function isSameDayInTenantTimeZone(
  first: DateInput,
  second: DateInput,
  timeZone: string = DEFAULT_TIME_ZONE,
): boolean {
  return isSameDay(
    convertUTCToTimeZone(first, timeZone),
    convertUTCToTimeZone(second, timeZone),
  );
}

export function getSupportedLocale(locale: LocaleInput): Locale {
  return resolveLocale(locale);
}

export const DEFAULT_TIMEZONE = DEFAULT_TIME_ZONE;
export const DEFAULT_LOCALE_CODE = "en-GB";
