"use client";

import useSWR from "swr";
import { DEFAULT_LOCALE_CODE, DEFAULT_TIMEZONE } from "@/lib/datetime";

interface ReportingTimeConfigResponse {
  timeZone?: string;
  locale?: string;
  source?: {
    timeZone: "user" | "tenant" | "default";
    locale: "user" | "tenant" | "default";
  };
}

const fetcher = async (url: string): Promise<ReportingTimeConfigResponse | null> => {
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 401) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Failed to load reporting time config (${res.status})`);
  }
  return (await res.json()) as ReportingTimeConfigResponse;
};

export function useReportingTimeConfig() {
  const { data, error, isLoading } = useSWR<ReportingTimeConfigResponse | null>(
    "/api/reports/time-config",
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  const timeZone = data?.timeZone || DEFAULT_TIMEZONE;
  const locale = data?.locale || DEFAULT_LOCALE_CODE;

  return {
    timeZone,
    locale,
    source: data?.source,
    isLoading,
    error,
  };
}

