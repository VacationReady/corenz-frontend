import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employee = await prisma.employee.findFirst({
    where: { id, companyId: session.user.companyId },
    select: { id: true },
  });

  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  console.log(
    `[API] Fetching working pattern assignments for employee ${id}`,
  );

  const assignments = await prisma.employeeWorkingPatternAssignment.findMany({
    where: {
      employeeId: employee.id,
      Employee: { companyId: session.user.companyId },
    },
    include: { WorkingPattern: true },
    orderBy: { effectiveDate: "desc" },
  });

  return NextResponse.json(assignments);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const employee = await prisma.employee.findFirst({
      where: { id, companyId: session.user.companyId },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { workingPatternId, effectiveDate } = body;

    console.log(`[API] Attempting to assign working pattern`, {
      employeeId: id,
      workingPatternId,
      effectiveDate,
    });

    if (!workingPatternId || !effectiveDate) {
      console.error(`[API] Missing fields:`, {
        workingPatternId,
        effectiveDate,
      });
      return NextResponse.json(
        { error: "workingPatternId and effectiveDate are required" },
        { status: 400 },
      );
    }

    const workingPattern = await prisma.workingPattern.findFirst({
      where: { id: workingPatternId, companyId: session.user.companyId },
      select: { id: true },
    });

    if (!workingPattern) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const assignment = await prisma.employeeWorkingPatternAssignment.create({
      data: {
        id: crypto.randomUUID(),
        employeeId: employee.id,
        workingPatternId,
        effectiveDate: new Date(effectiveDate),
        updatedAt: new Date(),
      },
      include: { WorkingPattern: true },
    });

    console.log(
      `[API] Successfully created working pattern assignment:`,
      assignment,
    );

    return NextResponse.json({ success: true, assignment });
  } catch (error: any) {
    console.error(`[API] Error creating working pattern assignment:`, error);
    return NextResponse.json(
      { error: "An error occurred while assigning the working pattern." },
      { status: 500 },
    );
  }
}
