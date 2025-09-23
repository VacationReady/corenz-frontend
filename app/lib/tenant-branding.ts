import type { Session } from "next-auth";

export type TenantBranding = {
  /** Display name for the tenant. */
  name: string;
  /** Short display name that can be used in headings. */
  shortName: string;
  /** Initials rendered when a logo is unavailable. */
  initials: string;
  /** Full width logo for marketing/login screens. */
  logoUrl?: string | null;
  /** Square logo suitable for avatars or sidebar marks. */
  squareLogoUrl?: string | null;
  /** Optional brand accent colour. */
  accentColor?: string | null;
  /** Optional support email for contextual copy. */
  supportEmail?: string | null;
  /** Optional tagline or helper copy. */
  tagline?: string | null;
  /** Optional custom login headline. */
  loginHeadline?: string | null;
  /** Optional custom login subtitle. */
  loginSubtitle?: string | null;
};

export type TenantBrandingInput = Partial<TenantBranding> | null | undefined;

export const DEFAULT_TENANT_BRANDING: TenantBranding = {
  name: "PeopleCore",
  shortName: "PeopleCore",
  initials: "PC",
  logoUrl: "/peoplecore-logo.svg",
  squareLogoUrl: "/peoplecore-logo.svg",
  accentColor: null,
  supportEmail: null,
  tagline: null,
  loginHeadline: null,
  loginSubtitle: null,
};

export function computeInitials(
  name: string | null | undefined,
  fallback: string = DEFAULT_TENANT_BRANDING.initials,
): string {
  const value = name?.trim();
  if (!value) {
    return fallback;
  }
  const cleaned = value
    // Replace any non letter/number characters with spaces so initials derive from readable words.
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return fallback;
  }

  const parts = cleaned.split(" ");
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase() || fallback;
  }

  const initials = parts
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || fallback;
}

export function normalizeTenantBranding(
  input?: TenantBrandingInput,
): TenantBranding {
  if (!input) {
    return { ...DEFAULT_TENANT_BRANDING };
  }

  const name = input.name?.trim() || DEFAULT_TENANT_BRANDING.name;
  const shortName = input.shortName?.trim() || name;
  const initials = computeInitials(
    input.initials?.trim() || shortName,
    DEFAULT_TENANT_BRANDING.initials,
  );

  const logoUrl =
    input.logoUrl ?? DEFAULT_TENANT_BRANDING.logoUrl ?? undefined;
  const squareLogoUrl =
    input.squareLogoUrl ?? logoUrl ?? DEFAULT_TENANT_BRANDING.squareLogoUrl;

  return {
    ...DEFAULT_TENANT_BRANDING,
    ...input,
    name,
    shortName,
    initials,
    logoUrl,
    squareLogoUrl,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractBrandingCandidate(source: unknown): TenantBrandingInput {
  if (!isRecord(source)) {
    return null;
  }

  const tenantRecord = isRecord(source["tenant"]) ? source["tenant"] : null;
  const companyRecord = isRecord(source["company"]) ? source["company"] : null;
  const profileRecord = isRecord(source["profile"]) ? source["profile"] : null;

  const candidate =
    source["branding"] ??
    source["tenantBranding"] ??
    (tenantRecord ? tenantRecord["branding"] : undefined) ??
    (companyRecord ? companyRecord["branding"] : undefined) ??
    (profileRecord ? profileRecord["branding"] : undefined);

  if (isRecord(candidate)) {
    return candidate as TenantBrandingInput;
  }

  const nameCandidate =
    source["tenantName"] ??
    source["companyName"] ??
    (companyRecord ? companyRecord["name"] : undefined) ??
    (tenantRecord ? tenantRecord["name"] : undefined);

  if (typeof nameCandidate === "string" && nameCandidate.trim().length > 0) {
    return { name: nameCandidate };
  }

  return null;
}

export function extractBrandingFromSession(
  session: Session | null | undefined,
): TenantBranding | null {
  if (!session) {
    return null;
  }

  const directCandidate = extractBrandingCandidate(session);
  if (directCandidate) {
    return normalizeTenantBranding(directCandidate);
  }

  const userCandidate = extractBrandingCandidate(session.user);
  if (userCandidate) {
    return normalizeTenantBranding(userCandidate);
  }

  return null;
}

export async function requestTenantBranding(): Promise<TenantBranding> {
  const response = await fetch("/api/tenant/branding", {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load tenant branding (${response.status})`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error("Unable to parse tenant branding response");
  }

  let brandingData: unknown = payload;
  if (isRecord(payload) && "branding" in payload) {
    brandingData = (payload as { branding?: unknown }).branding;
  }

  if (!isRecord(brandingData)) {
    throw new Error("Tenant branding response was empty");
  }

  return normalizeTenantBranding(brandingData as TenantBrandingInput);
}
