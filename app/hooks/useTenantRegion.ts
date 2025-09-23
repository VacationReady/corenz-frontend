import useSWR from "swr";

export type TenantTemplate = "NZ" | "AU" | "UK" | null;

interface TenantRegionResponse {
  template: TenantTemplate;
  region: string | null;
}

const fetcher = async (url: string): Promise<TenantRegionResponse> => {
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 401) {
    return { template: null, region: null };
  }
  if (!res.ok) {
    throw new Error(`Failed to load tenant region (${res.status})`);
  }
  const data = (await res.json()) as Partial<TenantRegionResponse>;
  return {
    template: (data.template as TenantTemplate) ?? null,
    region: data.region ?? null,
  };
};

export function useTenantRegion() {
  const { data, error, isLoading } = useSWR<TenantRegionResponse>(
    "/api/settings/public-holidays",
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  const template = data?.template ?? null;
  const regionName = template === "NZ"
    ? "New Zealand"
    : template === "AU"
    ? "Australia"
    : template === "UK"
    ? "United Kingdom"
    : null;

  return {
    template,
    regionName,
    rawRegion: data?.region ?? null,
    isLoading,
    error,
  };
}
