import { NextResponse, NextRequest } from "next/server";
import { calculateLeaveDeductionBatchEnhanced } from "@/lib/calculateLeaveDeductionBatchEnhanced";
import { formatLeaveBalance } from "@/lib/decimalPrecision";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: employeeId } = await context.params;
  const startDateParam = req.nextUrl.searchParams.get("startDate");
  const endDateParam = req.nextUrl.searchParams.get("endDate");
  // Half-day parameters for multi-day bookings
  const startDayType = req.nextUrl.searchParams.get("startDayType") || "FULL_DAY";
  const endDayType = req.nextUrl.searchParams.get("endDayType") || "FULL_DAY";
  // Single-day dayType parameter
  const dayType = req.nextUrl.searchParams.get("dayType") || "FULL_DAY";

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
  let deduction = results.reduce((sum, r) => sum + r.deduction, 0);
  let deductionHours = results.reduce((sum, r) => sum + r.deductionHours, 0);

  // Adjust for half-day start/end on multi-day bookings
  const isSingleDay = startDate.getTime() === endDate.getTime();
  if (isSingleDay) {
    // Single day: apply dayType directly
    if (dayType === "HALF_DAY_AM" || dayType === "HALF_DAY_PM") {
      deduction = deduction * 0.5;
      deductionHours = deductionHours * 0.5;
    }
  } else {
    // Multi-day: adjust for half-day start and/or end
    // Get hours per day from first result for proportional calculation
    const hoursPerDay = results[0]?.hoursPerDay || 8;
    
    if (startDayType === "HALF_DAY_PM" && results.length > 0) {
      // Starting afternoon = half day on first day
      const firstDayDeduction = results[0]?.deduction || 0;
      const firstDayHours = results[0]?.deductionHours || 0;
      deduction -= firstDayDeduction * 0.5;
      deductionHours -= firstDayHours * 0.5;
    }
    if (endDayType === "HALF_DAY_AM" && results.length > 0) {
      // Ending morning = half day on last day
      const lastDayDeduction = results[results.length - 1]?.deduction || 0;
      const lastDayHours = results[results.length - 1]?.deductionHours || 0;
      deduction -= lastDayDeduction * 0.5;
      deductionHours -= lastDayHours * 0.5;
    }
  }

  // Check if hours display is enabled for this employee's company
  // Default to true (hours enabled) when not explicitly set to false
  let hoursEnabled = true;
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true },
    });
    if (employee?.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: employee.companyId },
      });
      // Type assertion for leaveHoursEnabled field that may not exist in Prisma types yet
      const companyWithConfig = company as typeof company & { leaveHoursEnabled?: boolean | null };
      hoursEnabled = companyWithConfig?.leaveHoursEnabled !== false;
    }
  } catch {
    // Default to true if error (hours enabled by default)
  }

  // Format to 2 decimal places to avoid floating point precision issues
  return NextResponse.json({ 
    deduction: formatLeaveBalance(deduction),
    deductionHours: formatLeaveBalance(deductionHours),
    hoursEnabled,
  });
}
