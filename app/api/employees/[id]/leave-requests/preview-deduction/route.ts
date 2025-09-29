import { NextResponse, NextRequest } from "next/server";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: employeeId } = await context.params;
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
  // Business rule: end date is the return-to-work date (exclusive)
  // So we only count up to the day before the endDate.
  const exclusiveEnd = new Date(endDate);
  exclusiveEnd.setDate(exclusiveEnd.getDate() - 1);

  let deduction = 0;
  for (
    let time = startDate.getTime();
    time <= exclusiveEnd.getTime();
    time += 24 * 60 * 60 * 1000
  ) {
    const currentDate = new Date(time);
    deduction += await calculateLeaveDeduction(employeeId, currentDate);
  }

  return NextResponse.json({ deduction });
}
