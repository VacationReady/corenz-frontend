import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySignedToken } from "../login/route";

const COOKIE_NAME = "tenant_admin_session";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(COOKIE_NAME);

    if (!session?.value) {
      return NextResponse.json({ authenticated: false });
    }

    // Verify the signed token
    const { valid, expired } = verifySignedToken(session.value);

    if (!valid) {
      // Clear invalid/expired cookie
      if (expired) {
        cookieStore.delete(COOKIE_NAME);
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
