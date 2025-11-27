import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { createSignedToken, TENANT_ADMIN_COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/tenant-admin-auth";

const TENANT_ADMIN_PASSWORD = process.env.TENANT_ADMIN_PASSWORD;

// Rate limiting configuration
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting and audit
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || 
               request.headers.get("x-real-ip") || 
               "unknown";
    
    // Rate limiting to prevent brute force
    const rateLimitKey = `tenant_admin_login:${ip}`;
    const isRateLimited = await rateLimit(rateLimitKey, {
      limit: MAX_LOGIN_ATTEMPTS,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    
    if (isRateLimited) {
      console.warn(`[TENANT_ADMIN_LOGIN] Rate limited IP: ${ip}`);
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!TENANT_ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Tenant admin portal is not configured. Set TENANT_ADMIN_PASSWORD environment variable." },
        { status: 500 }
      );
    }

    if (!password || password !== TENANT_ADMIN_PASSWORD) {
      // Log failed attempt for security monitoring
      console.warn(`[TENANT_ADMIN_LOGIN] Failed login attempt from IP: ${ip}`);
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Create signed session token
    const token = createSignedToken();

    // Set secure session cookie with signed token
    const cookieStore = await cookies();
    cookieStore.set(TENANT_ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    // Log successful login for audit
    console.log(`[TENANT_ADMIN_LOGIN] Successful login from IP: ${ip}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tenant admin login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
