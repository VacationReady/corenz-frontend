import { NextResponse } from "next/server";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";

export async function GET(
  _req: Request,
  { params, url }: { params: { id: string }; url: URL }
) {
  const employeeId = params.id;
  const startDate = new Date(url.searchParams.get("startDate")!);
  const endDate   = new Date(url.searchParams.get("endDate")!);

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
