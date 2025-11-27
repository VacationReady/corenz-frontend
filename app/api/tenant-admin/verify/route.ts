import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySignedToken, TENANT_ADMIN_COOKIE_NAME } from "@/lib/tenant-admin-auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(TENANT_ADMIN_COOKIE_NAME);

    if (!session?.value) {
      return NextResponse.json({ authenticated: false });
    }

    // Verify the signed token
    const { valid, expired } = verifySignedToken(session.value);

    if (!valid) {
      // Clear invalid/expired cookie
      if (expired) {
        cookieStore.delete(TENANT_ADMIN_COOKIE_NAME);
      }
      return NextResponse.json({ 
        authenticated: false,
        reason: expired ? "session_expired" : "invalid_token"
      });
    }

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error("Tenant admin verify error:", error);
    return NextResponse.json({ authenticated: false });
  }
}
