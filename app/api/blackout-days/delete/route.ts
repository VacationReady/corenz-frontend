import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// 🚩 disables Vercel caching for this API
export const revalidate = 0;

/**
 * POST /api/blackout-days/delete
 * Expects:
 * {
 *    blackoutDayId: string
 * }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { blackoutDayId } = await req.json();

    if (!blackoutDayId) {
      return NextResponse.json(
        { error: "Missing blackoutDayId" },
        { status: 400 },
      );
    }

    const result = await prisma.blackoutDay.deleteMany({
      where: { id: blackoutDayId, companyId: session.user.companyId },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, message: "Blackout day deleted." }, { status: 200 });
  } catch (error) {
    console.error("❌ Error deleting blackout day:", error);
    return NextResponse.json(
      { error: "Failed to delete blackout day." },
      { status: 500 },
    );
  }
}
