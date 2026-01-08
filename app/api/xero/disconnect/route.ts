import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { disconnectXero } from "@/lib/xero";
import { isAdmin } from "@/lib/roles";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (!isAdmin(session.user)) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    await disconnectXero(session.user.companyId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting Xero:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
