import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const { blackoutDayId } = await req.json();

    if (!blackoutDayId) {
      return NextResponse.json(
        { error: "Missing blackoutDayId" },
        { status: 400 },
      );
    }

    await prisma.blackoutDay.delete({
      where: { id: blackoutDayId },
    });

    return NextResponse.json(
      { success: true, message: "Blackout day deleted." },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Error deleting blackout day:", error);
    return NextResponse.json(
      { error: "Failed to delete blackout day." },
      { status: 500 },
    );
  }
}
