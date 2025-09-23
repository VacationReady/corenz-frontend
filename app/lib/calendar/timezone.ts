import type { Locale } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { enNZ, enGB, enAU } from "date-fns/locale";

type Template = "NZ" | "AU" | "UK" | null;

type RegionCode =
  | "NZ"
  | "NZ-AUK"
  | "NZ-WGN"
  | "NZ-CAN"
  | "NZ-OTA"
  | "AU"
  | "AU-NSW"
  | "AU-VIC"
  | "AU-QLD"
  | "AU-SA"
  | "AU-WA"
  | "AU-TAS"
  | "AU-NT"
  | "AU-ACT"
  | "GB-ENG"
  | "GB-SCT"
  | "GB-NIR"
  | string
  | null;

const TEMPLATE_TIMEZONE_MAP: Record<Exclude<Template, null>, string> = {
  NZ: "Pacific/Auckland",
  AU: "Australia/Sydney",
  UK: "Europe/London",
};

const REGION_TIMEZONE_MAP: Record<string, string> = {
  NZ: "Pacific/Auckland",
  "NZ-AUK": "Pacific/Auckland",
  "NZ-WGN": "Pacific/Auckland",
  "NZ-CAN": "Pacific/Auckland",
  "NZ-OTA": "Pacific/Auckland",
  AU: "Australia/Sydney",
  "AU-NSW": "Australia/Sydney",
  "AU-VIC": "Australia/Sydney",
  "AU-QLD": "Australia/Brisbane",
  "AU-SA": "Australia/Adelaide",
  "AU-WA": "Australia/Perth",
  "AU-TAS": "Australia/Hobart",
  "AU-NT": "Australia/Darwin",
  "AU-ACT": "Australia/Sydney",
  "GB-ENG": "Europe/London",
  "GB-SCT": "Europe/London",
  "GB-NIR": "Europe/London",
};

const TEMPLATE_LOCALE_MAP: Record<Exclude<Template, null>, string> = {
  NZ: "en-NZ",
  AU: "en-AU",
  UK: "en-GB",
};

const TEMPLATE_LOCALE_OBJECT_MAP: Partial<Record<Exclude<Template, null>, Locale>> = {
  NZ: enNZ,
  AU: enAU,
  UK: enGB,
};

export interface TenantTimeSettings {
  timeZone: string;
  locale: string;
  template: Template;
}

export function resolveTenantTimeSettings(
  template: Template,
  region: RegionCode,
): TenantTimeSettings {
  if (!template) {
    return {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      locale: "en-NZ",
      template: null,
    };
  }

  const regionTimeZone = region ? REGION_TIMEZONE_MAP[region] : undefined;
  const timeZone = regionTimeZone || TEMPLATE_TIMEZONE_MAP[template] || "UTC";
  const locale = TEMPLATE_LOCALE_MAP[template] || "en-NZ";

  return { timeZone, locale, template };
}

export function formatTenantDate(
  date: Date | string,
  { timeZone, template }: TenantTimeSettings,
  formatString: string,
): string {
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "";
  const localeObject = template ? TEMPLATE_LOCALE_OBJECT_MAP[template] : undefined;
  return formatInTimeZone(value, timeZone, formatString, {
    locale: localeObject ?? undefined,
  });
}

