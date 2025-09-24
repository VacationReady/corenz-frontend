import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { resolveTransactionalPreference } from "@/lib/transactional-notifications";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can view/adjust preferences
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const section = url.searchParams.get("section");
    if (!section) {
      return NextResponse.json({ error: "Missing section" }, { status: 400 });
    }

    const companyId = session.user.companyId;

    // Verify company exists (optional safety)
    if (!companyId) {
      return NextResponse.json({ error: "Invalid company context" }, { status: 400 });
    }

    const pref = await resolveTransactionalPreference(companyId, section);

    // Default behavior: admin-only notifications if unset
    const notifyAdmin = pref?.notifyAdmin ?? true;
    const notifyManager = pref?.notifyManager ?? false;
    const notifyEmployee = pref?.notifyEmployee ?? false;

    return NextResponse.json({
      section,
      notifyAdmin,
      notifyManager,
      notifyEmployee,
    });
  } catch (error) {
    console.error("Error resolving transactional notification preference:", error);
    return NextResponse.json(
      { error: "Failed to resolve preference" },
      { status: 500 },
    );
  }
}


