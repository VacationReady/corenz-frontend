import { NextResponse, NextRequest } from "next/server";
import { calculateLeaveDeductionBatchEnhanced } from "@/lib/calculateLeaveDeductionBatchEnhanced";
import { formatLeaveBalance } from "@/lib/decimalPrecision";
import { prisma } from "@/lib/prisma";
import { isLeaveHoursEnabled } from "@/lib/leave/hours-conversion";

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

  // Build array of dates (batch optimized)
  const dates: Date[] = [];
  for (
    let time = startDate.getTime();
    time <= endDate.getTime();
    time += 24 * 60 * 60 * 1000
  ) {
    dates.push(new Date(time));
  }

  // Calculate deductions in batch with hours data
  const results = await calculateLeaveDeductionBatchEnhanced(employeeId, dates);
  const deduction = results.reduce((sum, r) => sum + r.deduction, 0);
  const deductionHours = results.reduce((sum, r) => sum + r.deductionHours, 0);

  // Check if hours display is enabled for this employee's company
  let hoursEnabled = false;
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true },
    });
    if (employee?.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: employee.companyId },
      });
      hoursEnabled = isLeaveHoursEnabled(company);
    }
  } catch {
    // Default to false if error
  }

  // Format to 2 decimal places to avoid floating point precision issues
  return NextResponse.json({ 
    deduction: formatLeaveBalance(deduction),
    deductionHours: formatLeaveBalance(deductionHours),
    hoursEnabled,
  });
}
