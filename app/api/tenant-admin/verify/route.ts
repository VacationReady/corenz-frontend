import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySignedToken, TENANT_ADMIN_COOKIE_NAME } from "@/lib/tenant-admin-auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(TENANT_ADMIN_COOKIE_NAME);

    console.log("[TENANT_ADMIN_VERIFY] Cookie present:", !!session?.value);

    if (!session?.value) {
      console.log("[TENANT_ADMIN_VERIFY] No session cookie found");
      return NextResponse.json({ authenticated: false });
    }

    // Verify the signed token
    const { valid, expired } = verifySignedToken(session.value);
    console.log("[TENANT_ADMIN_VERIFY] Token verification:", { valid, expired });

    if (!valid) {
      // Clear invalid/expired cookie
      if (expired) {
        cookieStore.delete(TENANT_ADMIN_COOKIE_NAME);
      }
      console.log("[TENANT_ADMIN_VERIFY] Authentication failed:", expired ? "session_expired" : "invalid_token");
      return NextResponse.json({ 
        authenticated: false,
        reason: expired ? "session_expired" : "invalid_token"
      });
    }

    console.log("[TENANT_ADMIN_VERIFY] Authentication successful");
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error("Tenant admin verify error:", error);
    return NextResponse.json({ authenticated: false });
  }
}
