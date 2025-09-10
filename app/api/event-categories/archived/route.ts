export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const archivedCategories = await prisma.eventCategory.findMany({
      where: {
        companyId: session.user.companyId,
        OR: [
          { isActive: false },
          { subcategories: { some: { isActive: false, companyId: session.user.companyId } } },
        ],
      },
      include: {
        subcategories: {
          where: { isActive: false, companyId: session.user.companyId },
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
