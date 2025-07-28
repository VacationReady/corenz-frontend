import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobRoles = await prisma.jobRole.findMany({
      where: {
        companyId: session.user.companyId,
        active: true, // ✅ Archive filtering
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        level: true,      // ✅ Useful for showing seniority (L1, L2, etc.)
        payGrade: true,   // ✅ Compensation context if used in future
      },
    });

    return NextResponse.json(jobRoles);
  } catch (error) {
    console.error("Error fetching active job roles:", error);
    return NextResponse.json({ error: "Failed to fetch active job roles" }, { status: 500 });
  }
}
