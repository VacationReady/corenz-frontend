import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const departments = await prisma.department.findMany({
      where: {
        companyId: session.user.companyId,
        active: true, // ✅ Only active
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true, // ✅ Useful for ERP sync in dropdown metadata
        User_Department_headIdToUser: {
          // ✅ Optional: show department head in UI if needed
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error("Error fetching active departments:", error);
    return NextResponse.json(
      { error: "Failed to fetch active departments" },
      { status: 500 },
    );
  }
}

