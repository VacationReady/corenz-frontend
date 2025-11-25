import { NextRequest, NextResponse } from "next/server";
import { decode } from "next-auth/jwt";
import { env } from "@/lib/env.server";
import { prisma } from "@/lib/prisma";

/**
 * Mobile session endpoint - validates JWT token from mobile app
 * This is separate from NextAuth's /api/auth/session which only works with browser cookies
 */
export async function GET(req: NextRequest) {
  try {
    // Get token from Cookie header (mobile app sends this)
    const cookieHeader = req.headers.get("cookie");
    let token: string | null = null;

    if (cookieHeader) {
      // Try different possible cookie names
      const cookieNames = [
        "next-auth.session-token",
        "__Secure-next-auth.session-token",
      ];

      for (const cookieName of cookieNames) {
        const match = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
        if (match) {
          token = decodeURIComponent(match[1]);
          break;
        }
      }
    }

    // Also check Authorization header as fallback
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { user: null, expires: null },
        { status: 200 }
      );
    }

    // Decode the JWT token
    const decoded = await decode({
      token,
      secret: env.NEXTAUTH_SECRET,
    });

    if (!decoded || !decoded.id || !decoded.companyId) {
      console.log("[mobile-session] Invalid token - missing required fields");
      return NextResponse.json(
        { user: null, expires: null },
        { status: 200 }
      );
    }

    // Verify the user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id as string },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        companyId: true,
      },
    });

    if (!user) {
      console.log("[mobile-session] User not found:", decoded.id);
      return NextResponse.json(
        { user: null, expires: null },
        { status: 200 }
      );
    }

    // Get employee record for additional info
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        department: true,
      },
    });

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`.trim()
        : (decoded.name as string) || user.email,
      role: user.role,
      companyId: user.companyId,
      homeCompanyId: user.companyId,
      // Include employee info if available
      employeeId: employee?.id,
      jobTitle: employee?.jobTitle,
      department: employee?.department,
    };

    // Calculate expiration from token
    const expires = decoded.exp
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    return NextResponse.json({
      user: sessionUser,
      expires,
    });
  } catch (error) {
    console.error("[mobile-session] Error validating session:", error);
    return NextResponse.json(
      { user: null, expires: null },
      { status: 200 }
    );
  }
}

