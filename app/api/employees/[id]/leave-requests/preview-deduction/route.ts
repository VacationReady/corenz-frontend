import { NextResponse, NextRequest } from "next/server";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";
import { formatLeaveBalance } from "@/lib/decimalPrecision";

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
  // End date is the last day away (inclusive) - UI instructs user not to include return-to-work day

  let deduction = 0;
  for (
    let time = startDate.getTime();
    time <= endDate.getTime();
    time += 24 * 60 * 60 * 1000
  ) {
    const currentDate = new Date(time);
    deduction += await calculateLeaveDeduction(employeeId, currentDate);
  }

  // Format to 2 decimal places to avoid floating point precision issues
  return NextResponse.json({ deduction: formatLeaveBalance(deduction) });
}
