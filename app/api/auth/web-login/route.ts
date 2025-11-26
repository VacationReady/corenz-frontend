import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";
import { env } from "@/lib/env.server";
import { rateLimit } from "@/lib/rate-limit";

// Rate limiting: 5 attempts per 15 minutes per IP
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5;

/**
 * Web-specific login endpoint that uses httpOnly cookies for security.
 * This is more secure than localStorage as cookies are not accessible to JavaScript,
 * protecting against XSS attacks.
 * 
 * For mobile apps, use /api/auth/mobile-login instead.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP address
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
               request.headers.get("x-real-ip") || 
               "unknown";
    const rateLimitKey = `web-login:${ip}`;
    
    const isRateLimited = await rateLimit(rateLimitKey, {
      limit: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });

    if (isRateLimited) {
      return NextResponse.json(
        { 
          error: "Too many login attempts. Please try again in 15 minutes." 
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const emailInput = email.trim();

    // Find user by email (case-insensitive)
    const users = await prisma.user.findMany({
      where: { email: { equals: emailInput, mode: "insensitive" } as any },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        companyId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!users.length) {
      console.warn("[web-auth] User not found for email", emailInput);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Try to match by password among all candidates
    let authenticatedUser = null;
    for (const candidate of users) {
      if (!candidate.password) continue;
      const ok = await bcrypt.compare(password, candidate.password);
      if (ok) {
        if (!candidate.companyId || candidate.companyId.trim() === "") {
          console.error("[web-auth] User has invalid companyId:", {
            userId: candidate.id,
            email: candidate.email,
          });
          continue;
        }
        authenticatedUser = candidate;
        break;
      }
    }

    if (!authenticatedUser) {
      console.warn("[web-auth] Invalid password for", emailInput);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    console.log("[web-auth] User authenticated successfully:", {
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
      companyId: authenticatedUser.companyId,
      role: authenticatedUser.role,
    });

    // Create JWT token using NextAuth's encode function for compatibility
    const token = await encode({
      token: {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        name: `${authenticatedUser.firstName || ""} ${authenticatedUser.lastName || ""}`.trim() || authenticatedUser.email,
        role: authenticatedUser.role,
        companyId: authenticatedUser.companyId,
        homeCompanyId: authenticatedUser.companyId,
        sub: authenticatedUser.id,
      },
      secret: env.NEXTAUTH_SECRET,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Set httpOnly cookie (not accessible to JavaScript - XSS protection)
    const isProduction = process.env.NODE_ENV === "production";
    const cookieName = isProduction 
      ? "__Host-next-auth.session-token" 
      : "next-auth.session-token";

    const response = NextResponse.json({
      success: true,
      user: {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        name: `${authenticatedUser.firstName || ""} ${authenticatedUser.lastName || ""}`.trim(),
        role: authenticatedUser.role,
        companyId: authenticatedUser.companyId,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Set secure, httpOnly cookie
    response.cookies.set(cookieName, token, {
      httpOnly: true, // Not accessible to JavaScript - prevents XSS attacks
      secure: isProduction, // Only send over HTTPS in production
      sameSite: "lax", // CSRF protection
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      ...(isProduction && {
        // __Host- prefix requires these settings
        domain: undefined, // No domain (more secure)
      }),
    });

    return response;
  } catch (error) {
    console.error("[web-auth] Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}



