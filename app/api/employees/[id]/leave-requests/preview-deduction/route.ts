import { NextResponse, NextRequest } from "next/server";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const employeeId = params.id;
  const startDateParam = req.nextUrl.searchParams.get("startDate");
  const endDateParam = req.nextUrl.searchParams.get("endDate");

  if (!startDateParam || !endDateParam) {
    return NextResponse.json(
      { error: "Missing startDate or endDate" },
      { status: 400 }
    );
  }

  const startDate = new Date(startDateParam);
  const endDate = new Date(endDateParam);

  let deduction = 0;
  for (
    let d = new Date(startDate);
    d <= endDate;
    d.setDate(d.getDate() + 1)
  ) {
    deduction += await calculateLeaveDeduction(employeeId, new Date(d));
  }

  return NextResponse.json({ deduction });
}
