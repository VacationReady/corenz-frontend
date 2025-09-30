import { NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

async function runBackfill() {
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
  return updated;
}

export async function POST() {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updated = await runBackfill();
    return NextResponse.json({ status: "success", updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}

// Convenience GET handler to trigger from the browser while logged in as admin
export async function GET() {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const updated = await runBackfill();
    return NextResponse.json({ status: "success", updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}


