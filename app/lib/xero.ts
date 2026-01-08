import { prisma } from "@/lib/prisma";

interface XeroTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Get a valid Xero access token for a company, refreshing if necessary
 */
export async function getXeroAccessToken(
  companyId: string
): Promise<string | null> {
  const integration = await prisma.xeroIntegration.findUnique({
    where: { companyId },
  });

  if (!integration || !integration.isActive) {
    return null;
  }

  // Check if token is expired or will expire in the next 5 minutes
  const now = new Date();
  const expiryBuffer = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

  if (integration.expiresAt > expiryBuffer) {
    // Token is still valid
    return integration.accessToken;
  }

  // Token is expired or about to expire, refresh it
  try {
    const tokens = await refreshXeroToken(integration.refreshToken);

    // Update the database with new tokens
    await prisma.xeroIntegration.update({
      where: { companyId },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
    });

    return tokens.accessToken;
  } catch (error) {
    console.error("Failed to refresh Xero token:", error);
    
    // Mark integration as inactive if refresh fails
    await prisma.xeroIntegration.update({
      where: { companyId },
      data: { isActive: false },
    });

    return null;
  }
}

/**
 * Refresh a Xero access token using the refresh token
 */
async function refreshXeroToken(refreshToken: string): Promise<XeroTokens> {
  const response = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Get the Xero tenant ID for a company
 */
export async function getXeroTenantId(
  companyId: string
): Promise<string | null> {
  const integration = await prisma.xeroIntegration.findUnique({
    where: { companyId },
    select: { xeroTenantId: true, isActive: true },
  });

  if (!integration || !integration.isActive) {
    return null;
  }

  return integration.xeroTenantId;
}

/**
 * Make an authenticated request to the Xero API
 */
export async function xeroApiRequest(
  companyId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = await getXeroAccessToken(companyId);
  if (!accessToken) {
    throw new Error("No valid Xero access token available");
  }

  const tenantId = await getXeroTenantId(companyId);
  if (!tenantId) {
    throw new Error("No Xero tenant ID found");
  }

  const url = `https://api.xero.com/api.xro/2.0${endpoint}`;

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      "xero-tenant-id": tenantId,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
}

/**
 * Disconnect Xero integration for a company
 */
export async function disconnectXero(companyId: string): Promise<void> {
  const integration = await prisma.xeroIntegration.findUnique({
    where: { companyId },
  });

  if (!integration) {
    return;
  }

  // Revoke the connection in Xero
  try {
    const response = await fetch(
      `https://identity.xero.com/connect/revoke/${integration.xeroTenantId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.warn("Failed to revoke Xero connection:", await response.text());
    }
  } catch (error) {
    console.warn("Error revoking Xero connection:", error);
  }

  // Delete from database
  await prisma.xeroIntegration.delete({
    where: { companyId },
  });
}
