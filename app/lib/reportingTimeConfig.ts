import { prisma } from "@/lib/prisma";
import {
  resolveTenantTimeSettings,
  type TenantTimeSettings,
} from "@/lib/calendar/timezone";
import { DEFAULT_LOCALE_CODE, DEFAULT_TIMEZONE } from "@/lib/datetime";

interface ReportingTimePreferences {
  locale?: string;
  preferredLocale?: string;
  timeZone?: string;
  timezone?: string;
  preferredTimeZone?: string;
  reporting?: {
    locale?: string;
    timeZone?: string;
  };
  settings?: {
    locale?: string;
    timeZone?: string;
  };
  [key: string]: unknown;
}

export interface ReportingTimeConfig {
  timeZone: string;
  locale: string;
  tenant: TenantTimeSettings;
  source: {
    timeZone: "user" | "tenant" | "default";
    locale: "user" | "tenant" | "default";
  };
}

function extractPreference(preferences: ReportingTimePreferences | undefined, key: "locale" | "timeZone") {
  if (!preferences) return undefined;
  const candidates: Array<string | undefined> = [];
  if (key === "locale") {
    candidates.push(preferences.locale);
    candidates.push(preferences.preferredLocale);
    candidates.push(preferences.reporting?.locale);
    candidates.push(preferences.settings?.locale);
  } else {
    candidates.push(preferences.timeZone);
    candidates.push(preferences.timezone);
    candidates.push(preferences.preferredTimeZone);
    candidates.push(preferences.reporting?.timeZone);
    candidates.push(preferences.settings?.timeZone);
  }

  return candidates.find((candidate) => typeof candidate === "string" && candidate.trim().length > 0)?.trim();
}

export async function resolveReportingTimeConfig(
  userId: string,
  companyId: string,
): Promise<ReportingTimeConfig> {
  const [user, company] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { emailPreferences: true },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { publicHolidayTemplate: true, publicHolidayRegion: true },
    }),
  ]);

  const tenant = resolveTenantTimeSettings(
    (company?.publicHolidayTemplate as TenantTimeSettings["template"]) ?? null,
    company?.publicHolidayRegion ?? null,
  );

  const userPrefs = (user?.emailPreferences ?? undefined) as ReportingTimePreferences | undefined;
  const preferredLocale = extractPreference(userPrefs, "locale");
  const preferredTimeZone = extractPreference(userPrefs, "timeZone");

  const locale = preferredLocale || tenant.locale || DEFAULT_LOCALE_CODE;
  const timeZone = preferredTimeZone || tenant.timeZone || DEFAULT_TIMEZONE;

  return {
    timeZone,
    locale,
    tenant,
    source: {
      timeZone: preferredTimeZone ? "user" : tenant.timeZone ? "tenant" : "default",
      locale: preferredLocale ? "user" : tenant.locale ? "tenant" : "default",
    },
  };
}

