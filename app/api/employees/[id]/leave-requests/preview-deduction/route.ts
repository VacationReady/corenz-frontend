import { NextResponse, NextRequest } from "next/server";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const employeeId = params.id;
  const startDateParam = req.nextUrl.searchParams.get("startDate");
  const endDateParam = req.nextUrl.searchParams.get("endDate");

  if (!startDateParam || !endDateParam) {
    return NextResponse.json(
      { error: "Missing startDate or endDate" },
      { status: 400 },
    );
  }

  const startDate = new Date(startDateParam);
  const endDate = new Date(endDateParam);

  let deduction = 0;
  for (
    let time = startDate.getTime();
    time <= endDate.getTime();
    time += 24 * 60 * 60 * 1000
  ) {
    const currentDate = new Date(time);
    deduction += await calculateLeaveDeduction(employeeId, currentDate);
  }

  return NextResponse.json({ deduction });
}
