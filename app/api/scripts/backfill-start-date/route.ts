import { NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST() {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employees = await prisma.employee.findMany({
      where: { startDate: null },
      select: {
        id: true,
        EmployeeWorkingPatternAssignment: {
          select: { effectiveDate: true },
          orderBy: { effectiveDate: "asc" },
        },
      },
    });

    let updated = 0;
    for (const emp of employees) {
      const earliest = emp.EmployeeWorkingPatternAssignment?.[0]?.effectiveDate;
      if (earliest) {
        await prisma.employee.update({ where: { id: emp.id }, data: { startDate: earliest } });
        updated++;
      }
    }

    return NextResponse.json({ status: "success", updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}


