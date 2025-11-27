import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { TENANT_ADMIN_COOKIE_NAME } from "@/lib/tenant-admin-auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(TENANT_ADMIN_COOKIE_NAME);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tenant admin logout error:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
