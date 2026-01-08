import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { disconnectXero } from "@/lib/xero";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
