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
        active: true,
        companyId: session.user.companyId,
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return NextResponse.json(jobRoles); // ✅ Matches frontend expectation
  } catch (error) {
    console.error("Error fetching active job roles:", error);
    return NextResponse.json({ error: "Failed to fetch active job roles" }, { status: 500 });
  }
}
