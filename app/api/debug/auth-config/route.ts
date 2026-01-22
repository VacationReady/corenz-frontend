import { NextResponse } from "next/server";

/**
 * Temporary debug endpoint to verify Azure AD OAuth configuration
 * ⚠️ REMOVE THIS ENDPOINT AFTER DEBUGGING - DO NOT DEPLOY TO PRODUCTION LONG-TERM
 * 
 * This endpoint helps diagnose the "invalid_client" OAuth error by verifying
 * that environment variables are properly loaded in the production environment.
 */
export async function GET() {
  const hasAzureClientId = !!process.env.AZURE_AD_CLIENT_ID;
  const hasAzureSecret = !!process.env.AZURE_AD_CLIENT_SECRET;
  const hasTenantId = !!process.env.AZURE_AD_TENANT_ID;
  const hasNextAuthUrl = !!process.env.NEXTAUTH_URL;
  const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;

  const allConfigured = hasAzureClientId && hasAzureSecret && hasTenantId && hasNextAuthUrl && hasNextAuthSecret;

  return NextResponse.json({
    status: allConfigured ? "configured" : "incomplete",
    environment: process.env.NODE_ENV,
    configuration: {
      hasAzureClientId,
      hasAzureSecret,
      hasTenantId,
      hasNextAuthUrl,
      hasNextAuthSecret,
      // Safe to expose these as they're not sensitive
      nextAuthUrl: process.env.NEXTAUTH_URL,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      // Show partial client ID for verification (first 8 chars only)
      clientIdPrefix: hasAzureClientId 
        ? process.env.AZURE_AD_CLIENT_ID!.substring(0, 8) + "..." 
        : null,
    },
    expectedCallbackUrl: hasNextAuthUrl 
      ? `${process.env.NEXTAUTH_URL}/api/auth/callback/azure-ad`
      : null,
    issues: [
      ...(!hasAzureClientId ? ["Missing AZURE_AD_CLIENT_ID"] : []),
      ...(!hasAzureSecret ? ["Missing AZURE_AD_CLIENT_SECRET"] : []),
      ...(!hasTenantId ? ["Missing AZURE_AD_TENANT_ID"] : []),
      ...(!hasNextAuthUrl ? ["Missing NEXTAUTH_URL"] : []),
      ...(!hasNextAuthSecret ? ["Missing NEXTAUTH_SECRET"] : []),
    ],
    instructions: allConfigured 
      ? "All environment variables are set. If OAuth still fails, check Azure AD redirect URI and client secret expiry."
      : "Set missing environment variables in your production environment.",
  });
}
