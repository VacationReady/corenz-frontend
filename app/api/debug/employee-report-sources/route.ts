import { NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(req: Request) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const employee = await prisma.employee.findFirst({
      where: { id, companyId: session.user.companyId },
      select: {
        id: true,
        startDate: true,
        workingPatternId: true,
        Department: { select: { id: true, name: true } },
        JobRole: { select: { id: true, name: true } },
        WorkingPattern: { select: { id: true, name: true } },
        EmployeeWorkingPatternAssignment: {
          select: {
            id: true,
            effectiveDate: true,
            WorkingPattern: { select: { id: true, name: true } },
          },
          orderBy: { effectiveDate: "desc" },
        },
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            JobRole: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const workingPatternDirect = employee.WorkingPattern?.name ?? null;
    const wpFromAssignment = employee.EmployeeWorkingPatternAssignment?.[0]?.WorkingPattern?.name ?? null;
    const workingPatternComputed = workingPatternDirect || wpFromAssignment || null;

    const startDateDirect = employee.startDate ?? null;
    const earliestAssignment = [...(employee.EmployeeWorkingPatternAssignment || [])]
      .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime())[0];
    const startDateComputed = startDateDirect || earliestAssignment?.effectiveDate || null;

    return NextResponse.json({
      id: employee.id,
      department: employee.Department?.name ?? null,
      jobRoleEmployee: employee.JobRole?.name ?? null,
      jobRoleUser: employee.User?.JobRole?.name ?? null,
      workingPattern: {
        direct: workingPatternDirect,
        fromLatestAssignment: wpFromAssignment,
        computed: workingPatternComputed,
        workingPatternId: employee.workingPatternId ?? null,
      },
      startDate: {
        direct: startDateDirect,
        fromEarliestAssignment: earliestAssignment?.effectiveDate ?? null,
        computed: startDateComputed,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}


