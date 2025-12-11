import { NextRequest, NextResponse } from "next/server";
import { decode } from "next-auth/jwt";
import { env } from "@/lib/env.server";

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
    const cookieName = isProduction 
      ? "__Secure-next-auth.session-token" 
      : "next-auth.session-token";
    
    // Try to get user info from token for audit logging
    const cookieToken = request.cookies.get(cookieName)?.value;
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

    // Clear the session cookie by setting it to expire immediately
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 0, // Expire immediately
      expires: new Date(0), // Set to past date
    });

    // Also clear the non-secure version in case it exists
    if (isProduction) {
      response.cookies.set("next-auth.session-token", "", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
    }

    return response;
  } catch (error) {
    console.error("[auth-signout] Signout error:", error);
    // Even on error, try to clear the cookie
    const response = NextResponse.json(
      { success: false, error: "An error occurred during signout" },
      { status: 500 }
    );
    
    const isProduction = process.env.NODE_ENV === "production";
    const cookieName = isProduction 
      ? "__Secure-next-auth.session-token" 
      : "next-auth.session-token";
    
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
    
    return response;
  }
}
