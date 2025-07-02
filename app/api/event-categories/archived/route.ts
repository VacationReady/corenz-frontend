// File: app/api/event-categories/archived/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const archivedCategories = await prisma.eventCategory.findMany({
      where: { isActive: false },
      include: {
        subcategories: {
          where: { isActive: false },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, data: archivedCategories });
  } catch (error: any) {
    console.error("[Archived Event Categories GET]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch archived event categories." },
      { status: 500 }
    );
  }
}
