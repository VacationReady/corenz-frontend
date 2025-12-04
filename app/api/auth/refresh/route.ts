import { NextRequest, NextResponse } from "next/server";
import { decode, encode } from "next-auth/jwt";
import { env } from "@/lib/env.server";
import { prisma } from "@/lib/prisma";

/**
 * Refresh JWT token endpoint for mobile apps.
 * Extends token expiration if token is still valid.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

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
      },
    });

    if (!user || !user.companyId) {
      return NextResponse.json(
        { error: "User not found or inactive" },
        { status: 401 }
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
        homeCompanyId: decoded.homeCompanyId as string | undefined || user.companyId,
        sub: user.id,
      },
      secret: env.NEXTAUTH_SECRET,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return NextResponse.json({
      success: true,
      sessionToken: newToken,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("[auth-refresh] Refresh error:", error);
    return NextResponse.json(
      { error: "An error occurred during token refresh" },
      { status: 500 }
    );
  }
}















