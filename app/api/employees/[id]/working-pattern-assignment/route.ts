import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
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
  const { workingPatternId, effectiveDate } = await req.json();
  if (!workingPatternId || !effectiveDate) {
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
  return NextResponse.json(assignment);
}
