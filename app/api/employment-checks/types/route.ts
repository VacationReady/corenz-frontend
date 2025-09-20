import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch distinct typeOfCheck values for the current company via Employee relation
    const checks = await prisma.employmentCheck.findMany({
      where: {
        Employee: {
          companyId: session.user.companyId,
        },
      },
      select: { typeOfCheck: true },
    });

    const set = new Set<string>();
    for (const c of checks) {
      if (c.typeOfCheck) set.add(c.typeOfCheck);
    }

    const types = Array.from(set).sort((a, b) => a.localeCompare(b));
    return NextResponse.json(types);
  } catch (error) {
    console.error("GET /api/employment-checks/types error:", error);
    return NextResponse.json(
      { error: "Failed to fetch employment check types" },
      { status: 500 },
    );
  }
}


