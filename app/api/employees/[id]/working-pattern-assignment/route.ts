import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  console.log(`[API] Fetching working pattern assignments for employee ${params.id}`);

  const assignments = await prisma.employeeWorkingPatternAssignment.findMany({
    where: { employeeId: params.id },
    include: { workingPattern: true },
    orderBy: { effectiveDate: "desc" },
  });

  return NextResponse.json(assignments);
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { workingPatternId, effectiveDate } = body;

    console.log(`[API] Attempting to assign working pattern`, {
      employeeId: params.id,
      workingPatternId,
      effectiveDate,
    });

    if (!workingPatternId || !effectiveDate) {
      console.error(`[API] Missing fields:`, { workingPatternId, effectiveDate });
      return NextResponse.json(
        { error: "workingPatternId and effectiveDate are required" },
        { status: 400 }
      );
    }

    const assignment = await prisma.employeeWorkingPatternAssignment.create({
      data: {
        employeeId: params.id,
        workingPatternId,
        effectiveDate: new Date(effectiveDate),
      },
    });

    console.log(`[API] Successfully created working pattern assignment:`, assignment);

    return NextResponse.json({ success: true, assignment });
  } catch (error: any) {
    console.error(`[API] Error creating working pattern assignment:`, error);
    return NextResponse.json(
      { error: "An error occurred while assigning the working pattern." },
      { status: 500 }
    );
  }
}
