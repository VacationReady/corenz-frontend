import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { rateLimit } from "@/lib/rate-limit";

const TENANT_ADMIN_PASSWORD = process.env.TENANT_ADMIN_PASSWORD;
const SECRET = process.env.NEXTAUTH_SECRET || "fallback-secret-change-me";
const COOKIE_NAME = "tenant_admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours
const TOKEN_EXPIRY_MS = COOKIE_MAX_AGE * 1000;

// Rate limiting configuration
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Create a signed token for tenant admin session
 */
function createSignedToken(): string {
  const payload = {
    authenticated: true,
    timestamp: Date.now(),
    expiresAt: Date.now() + TOKEN_EXPIRY_MS,
  };
  
  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadStr).toString("base64url");
  
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(payloadBase64)
    .digest("base64url");
  
  return `${payloadBase64}.${signature}`;
}

/**
 * Verify a signed token
 */
export function verifySignedToken(token: string): { valid: boolean; expired?: boolean } {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) {
      return { valid: false };
    }
    
    const [payloadBase64, providedSignature] = parts;
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", SECRET)
      .update(payloadBase64)
      .digest("base64url");
    
    if (!crypto.timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    )) {
      return { valid: false };
    }
    
    // Decode and verify expiry
    const payloadStr = Buffer.from(payloadBase64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadStr);
    
    if (!payload.authenticated || !payload.expiresAt) {
      return { valid: false };
    }
    
    if (Date.now() > payload.expiresAt) {
      return { valid: false, expired: true };
    }
    
    return { valid: true };
  } catch {
    return { valid: false };
  }
}

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
    cookieStore.set(COOKIE_NAME, token, {
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
