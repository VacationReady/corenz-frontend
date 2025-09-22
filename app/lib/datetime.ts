import { formatInTimeZone, utcToZonedTime } from "date-fns-tz";
import { isSameDay } from "date-fns";
import type { Locale } from "date-fns";
import { enAU, enGB, enNZ } from "date-fns/locale";

export type TenantTemplate = "NZ" | "AU" | "UK" | "UNKNOWN";

export interface TenantDatePreferences {
  tenant: TenantTemplate;
  locale: string;
  timeZone: string;
}

export interface TenantDateFormatOptions {
  tenant?: TenantDatePreferences;
  formatStr?: string;
}

export interface TenantDateRangeFormatOptions extends TenantDateFormatOptions {
  separator?: string;
  endFormatStr?: string;
}

type DateInput = Date | string | number;

type TemplateInput = TenantTemplate | "NZ" | "AU" | "UK" | string | null | undefined;

const DEFAULT_TENANT_PREFERENCES: TenantDatePreferences = {
  tenant: "NZ",
  locale: "en-NZ",
  timeZone: "Pacific/Auckland",
};

const localeMap: Record<string, Locale> = {
  "en-NZ": enNZ,
  "en-AU": enAU,
  "en-GB": enGB,
};

function resolveLocale(localeCode: string): Locale {
  return localeMap[localeCode] ?? enNZ;
}

function toDate(value: DateInput): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function resolveTenantDatePreferences(template: TemplateInput): TenantDatePreferences {
  const normalized = typeof template === "string" ? template.toUpperCase() : template;

  if (normalized === "AU") {
    return { tenant: "AU", locale: "en-AU", timeZone: "Australia/Sydney" };
  }

  if (normalized === "UK") {
    return { tenant: "UK", locale: "en-GB", timeZone: "Europe/London" };
  }

  if (normalized === "NZ") {
    return { tenant: "NZ", locale: "en-NZ", timeZone: "Pacific/Auckland" };
  }

  return { ...DEFAULT_TENANT_PREFERENCES, tenant: "UNKNOWN" };
}

export function formatTenantDate(
  date: DateInput,
  options: TenantDateFormatOptions = {},
): string {
  const tenant = options.tenant ?? DEFAULT_TENANT_PREFERENCES;
  const parsed = toDate(date);
  if (!parsed) return "Invalid Date";

  const formatStr = options.formatStr ?? "P";
  const locale = resolveLocale(tenant.locale);

  return formatInTimeZone(parsed, tenant.timeZone, formatStr, { locale });
}

export function formatTenantDateTime(
  date: DateInput,
  options: TenantDateFormatOptions = {},
): string {
  const tenant = options.tenant ?? DEFAULT_TENANT_PREFERENCES;
  const parsed = toDate(date);
  if (!parsed) return "Invalid Date";

  const formatStr = options.formatStr ?? "Pp";
  const locale = resolveLocale(tenant.locale);

  return formatInTimeZone(parsed, tenant.timeZone, formatStr, { locale });
}

export function formatTenantDateRange(
  start: DateInput,
  end: DateInput | null | undefined,
  options: TenantDateRangeFormatOptions = {},
): string {
  const tenant = options.tenant ?? DEFAULT_TENANT_PREFERENCES;
  const parsedStart = toDate(start);
  const parsedEnd = end != null ? toDate(end) : null;

  if (!parsedStart) return "Invalid Date";
  if (!parsedEnd) {
    return formatTenantDate(parsedStart, options);
  }

  const startZoned = utcToZonedTime(parsedStart, tenant.timeZone);
  const endZoned = utcToZonedTime(parsedEnd, tenant.timeZone);

  const sameDay = isSameDay(startZoned, endZoned);
  if (sameDay) {
    return formatTenantDate(parsedStart, options);
  }

  const separator = options.separator ?? " – ";
  const endFormat = options.endFormatStr ?? options.formatStr;

  const startFormatted = formatTenantDate(parsedStart, options);
  const endFormatted = formatTenantDate(parsedEnd, {
    ...options,
    formatStr: endFormat,
  });

  return `${startFormatted}${separator}${endFormatted}`;
}

export { DEFAULT_TENANT_PREFERENCES };
