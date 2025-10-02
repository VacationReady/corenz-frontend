import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { employeeIds } = await request.json();

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json({ error: "Invalid employee IDs" }, { status: 400 });
    }

    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        salaryAmount: true,
        hourlyRate: true,
        User: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const formatted = employees.map((emp) => ({
      id: emp.id,
      name: `${emp.User.firstName || ""} ${emp.User.lastName || ""}`.trim(),
      email: emp.User.email,
      salaryAmount: emp.salaryAmount ? Number(emp.salaryAmount) : null,
      hourlyRate: emp.hourlyRate ? Number(emp.hourlyRate) : null,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("[bulk-actions/compensation/preview]", error);
    return NextResponse.json(
      { error: error?.message || "Unable to fetch employee compensation data" },
      { status: 400 },
    );
  }
}

