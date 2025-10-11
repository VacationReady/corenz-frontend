import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "tenant_admin_session";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(COOKIE_NAME);

    return NextResponse.json({ 
      authenticated: session?.value === "authenticated" 
    });
  } catch (error) {
    console.error("Tenant admin verify error:", error);
    return NextResponse.json({ authenticated: false });
  }
}
