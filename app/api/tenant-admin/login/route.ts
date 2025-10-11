import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const TENANT_ADMIN_PASSWORD = process.env.TENANT_ADMIN_PASSWORD;
const COOKIE_NAME = "tenant_admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!TENANT_ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Tenant admin portal is not configured. Set TENANT_ADMIN_PASSWORD environment variable." },
        { status: 500 }
      );
    }

    if (!password || password !== TENANT_ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Set secure session cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tenant admin login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
