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
 * Mobile-specific login endpoint that bypasses NextAuth's CSRF requirements.
 * Returns a JWT token that the mobile app can use for authenticated requests.
 * 
 * Security features:
 * - Rate limiting (5 attempts per 15 minutes per IP)
 * - Password hashing verification
 * - JWT token with 30-day expiration
 * - User validation before token issuance
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP address
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
               request.headers.get("x-real-ip") || 
               "unknown";
    const rateLimitKey = `mobile-login:${ip}`;
    
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
      console.warn("[mobile-auth] User not found for email", emailInput);
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
          console.error("[mobile-auth] User has invalid companyId:", {
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
      console.warn("[mobile-auth] Invalid password for", emailInput);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    console.log("[mobile-auth] User authenticated successfully:", {
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
        name:
          `${authenticatedUser.firstName || ""} ${
            authenticatedUser.lastName || ""
          }`.trim() || authenticatedUser.email,
        role: authenticatedUser.role,
        companyId: authenticatedUser.companyId,
        homeCompanyId: authenticatedUser.companyId,
        sub: authenticatedUser.id,
      },
      secret: env.NEXTAUTH_SECRET,
      salt: env.NEXTAUTH_SECRET,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return NextResponse.json({
      success: true,
      sessionToken: token,
      user: {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        name: `${authenticatedUser.firstName || ""} ${authenticatedUser.lastName || ""}`.trim(),
        role: authenticatedUser.role,
        companyId: authenticatedUser.companyId,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("[mobile-auth] Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
