import { NextRequest, NextResponse } from "next/server";
import { decode } from "next-auth/jwt";
import { env } from "@/lib/env.server";
import { getSessionCookieNames, getAllSessionCookieNames, getClearCookieOptions } from "@/lib/auth-cookies";

// Note: Filter persistence is cleared client-side in auth-web.ts signOut()
// Server-side clearing is not possible since localStorage is client-only

/**
 * Custom signout endpoint that:
 * 1. Clears the httpOnly session cookie
 * 2. Can be extended for token revocation/blacklisting
 * 3. Logs the signout event for audit purposes
 * 
 * This endpoint supports both web (cookie-based) and mobile (token-based) clients.
 */
export async function POST(request: NextRequest) {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const cookieNames = getSessionCookieNames(isProduction);
    
    // Try to get user info from token for audit logging
    // Check all known cookie names for backward compatibility
    let cookieToken: string | undefined;
    for (const name of cookieNames) {
      cookieToken = request.cookies.get(name)?.value;
      if (cookieToken) break;
    }
    let userId: string | null = null;
    let companyId: string | null = null;
    
    if (cookieToken) {
      try {
        const decoded = await decode({
          token: cookieToken,
          secret: env.NEXTAUTH_SECRET,
          salt: env.NEXTAUTH_SECRET,
        });
        userId = decoded?.id as string || null;
        companyId = decoded?.companyId as string || null;
      } catch {
        // Token might be expired or invalid - that's okay for signout
      }
    }

    // Log signout event for audit trail
    if (userId) {
      console.log("[auth-signout] User signed out:", {
        userId,
        companyId,
        timestamp: new Date().toISOString(),
        ip: request.headers.get("x-forwarded-for")?.split(",")[0] || 
            request.headers.get("x-real-ip") || 
            "unknown",
      });
    }

    // TODO: If implementing token blacklisting, add the token to a blacklist here
    // This would be needed for immediate revocation of compromised tokens
    // Example: await addToTokenBlacklist(cookieToken, userId, expiresAt);

    // Create response that clears the session cookie
    const response = NextResponse.json({
      success: true,
      message: "Signed out successfully",
    });

    // Clear ALL known session cookies (v5 and legacy v4) to ensure complete cleanup
    const allCookieNames = getAllSessionCookieNames();
    for (const name of allCookieNames) {
      // Use appropriate secure flag based on cookie name prefix
      const isSecureCookie = name.startsWith("__Secure-");
      response.cookies.set(name, "", {
        ...getClearCookieOptions(isSecureCookie),
      });
    }

    return response;
  } catch (error) {
    console.error("[auth-signout] Signout error:", error);
    // Even on error, try to clear all cookies
    const response = NextResponse.json(
      { success: false, error: "An error occurred during signout" },
      { status: 500 }
    );
    
    // Clear ALL known session cookies even on error
    const allCookieNames = getAllSessionCookieNames();
    for (const name of allCookieNames) {
      const isSecureCookie = name.startsWith("__Secure-");
      response.cookies.set(name, "", {
        ...getClearCookieOptions(isSecureCookie),
      });
    }
    
    return response;
  }
}
