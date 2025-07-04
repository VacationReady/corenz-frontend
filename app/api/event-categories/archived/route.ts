export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const archivedCategories = await prisma.eventCategory.findMany({
      where: {
        OR: [
          { isActive: false },
          { subcategories: { some: { isActive: false } } },
        ],
      },
      include: {
        subcategories: {
          where: { isActive: false },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(
      "[Archived Event Categories GET] Returning:",
      JSON.stringify(archivedCategories, null, 2)
    );

    return NextResponse.json({ success: true, data: archivedCategories });
  } catch (error: any) {
    console.error("[Archived Event Categories GET]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch archived event categories." },
      { status: 500 }
    );
  }
}
