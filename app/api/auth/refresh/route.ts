import { NextRequest, NextResponse } from "next/server";
import { decode, encode } from "next-auth/jwt";
import { env } from "@/lib/env.server";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, getSessionCookieNames, getSessionCookieOptions } from "@/lib/auth-cookies";

// Session duration constants
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;

/**
 * Get token from request - supports both cookie-based (web) and body-based (mobile) auth
 * Checks all known cookie names (v5 and legacy v4) for backward compatibility
 */
async function getTokenFromRequest(request: NextRequest): Promise<string | null> {
  // First, try to get token from httpOnly cookie (web clients)
  // Check all known cookie names for backward compatibility during migration
  const isProduction = process.env.NODE_ENV === "production";
  const cookieNames = getSessionCookieNames(isProduction);
  
  for (const cookieName of cookieNames) {
    const cookieToken = request.cookies.get(cookieName)?.value;
    if (cookieToken) {
      return cookieToken;
    }
  }
  
  // Fallback: try to get token from request body (mobile clients)
  try {
    const body = await request.json();
    return body.token || null;
  } catch {
    return null;
  }
}

/**
 * Refresh JWT token endpoint.
 * Supports both:
 * - Web clients: Token from httpOnly cookie, refreshed cookie in response
 * - Mobile clients: Token in request body, new token in response body
 */
export async function POST(request: NextRequest) {
  try {
    // Determine if this is a web (cookie) or mobile (body) request
    const isProduction = process.env.NODE_ENV === "production";
    const cookieNames = getSessionCookieNames(isProduction);
    
    // Check all known cookie names for backward compatibility
    let cookieToken: string | undefined;
    for (const name of cookieNames) {
      cookieToken = request.cookies.get(name)?.value;
      if (cookieToken) break;
    }
    const isWebClient = !!cookieToken;
    
    // Get token from appropriate source
    let token: string | null = cookieToken ?? null;
    if (!token) {
      try {
        const body = await request.json();
        token = body.token;
      } catch {
        // No body or invalid JSON
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Decode and validate the existing token
    let decoded;
    try {
      decoded = await decode({
        token,
        secret: env.NEXTAUTH_SECRET,
        salt: env.NEXTAUTH_SECRET,
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (!decoded || !decoded.id || !decoded.companyId) {
      return NextResponse.json(
        { error: "Invalid token payload" },
        { status: 401 }
      );
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id as string },
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        firstName: true,
        lastName: true,
        sessionVersion: true,
        isActivated: true,
      },
    });

    if (!user || !user.companyId || !user.isActivated) {
      return NextResponse.json(
        { error: "User not found or inactive" },
        { status: 401 }
      );
    }

    const tokenSessionVersion = (decoded as any).sessionVersion ?? 0;
    if (user.sessionVersion !== tokenSessionVersion) {
      return NextResponse.json(
        { error: "Session is no longer valid" },
        { status: 401 },
      );
    }

    // Create new token with extended expiration
    const newToken = await encode({
      token: {
        id: user.id,
        email: decoded.email as string,
        name: decoded.name as string,
        role: user.role,
        companyId: user.companyId,
        homeCompanyId:
          ((decoded.homeCompanyId as string | undefined) ?? user.companyId),
        sessionVersion: user.sessionVersion,
        sub: user.id,
      },
      secret: env.NEXTAUTH_SECRET,
      salt: env.NEXTAUTH_SECRET,
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();

    // For web clients, set the new token as an httpOnly cookie using v5 naming
    if (isWebClient) {
      const response = NextResponse.json({
        success: true,
        expires: expiresAt,
        // Don't include token in body for web - it's in the cookie
      });

      // Always write using v5 cookie name
      const v5CookieName = getSessionCookieName(isProduction);
      response.cookies.set(v5CookieName, newToken, {
        ...getSessionCookieOptions(isProduction),
        maxAge: SESSION_MAX_AGE_SECONDS,
      });

      return response;
    }

    // For mobile clients, return token in response body
    return NextResponse.json({
      success: true,
      sessionToken: newToken,
      expires: expiresAt,
    });
  } catch (error) {
    console.error("[auth-refresh] Refresh error:", error);
    return NextResponse.json(
      { error: "An error occurred during token refresh" },
      { status: 500 }
    );
  }
}






















