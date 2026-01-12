/**
 * API Endpoint: Upcoming Annual Leave Anniversaries
 * 
 * Returns employees approaching their 12-month anniversary for annual leave entitlement.
 * 
 * NZ Holidays Act 2003 Compliance:
 * - Employees are NOT entitled to annual leave until 12 months of continuous employment
 * - This endpoint helps HR administrators prepare for upcoming entitlement grants
 * 
 * Requirements: 7.1, 7.2, 7.3
 * - 7.1: Provide visibility into employees approaching their 12-month anniversary (within 30 days)
 * - 7.2: Display the future entitlement amount for employees under 12 months
 * - 7.3: Show leave in advance balance for employees who have taken advance leave
 * 
 * @version 1.0
 * @date 2026
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { getMobileSession } from "@/lib/mobile-session";

/**
 * GET /api/employees/upcoming-anniversaries
 * 
 * Query Parameters:
 * - daysAhead: Number of days to look ahead (default: 30, max: 90)
 * 
 * Returns employees within the specified range of their 12-month anniversary
 * who have not yet received their annual leave entitlement.
 */
export async function GET(req: NextRequest) {
  try {
    await ensurePrismaConnected();
    const session = await getMobileSession(req);

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    
    // Parse daysAhead parameter (default: 30, max: 90)
    const daysAheadParam = searchParams.get("daysAhead");
    const parsedDaysAhead = daysAheadParam ? parseInt(daysAheadParam, 10) : 30;
    const daysAhead = Math.min(Math.max(1, Number.isFinite(parsedDaysAhead) ? parsedDaysAhead : 30), 90);

    const companyId = session.user.companyId;
    const today = new Date();
    
    // Calculate the date range for upcoming anniversaries
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + daysAhead);

    // Find employees approaching their anniversary
    // Criteria:
    // - annualLeaveEntitlementDate is within the range (today to today + daysAhead)
    // - Has a future entitlement stored (not yet crystallised)
    // - Not a casual employee
    // - Is active
    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        isActive: true,
        isCasualEmployee: false,
        annualLeaveEntitlementDate: {
          gte: today,
          lte: endDate,
        },
        futureAnnualLeaveEntitlement: {
          not: null,
          gt: 0,
        },
        // Exclude employees who already have LeaveEntitlement for Annual Leave
        LeaveEntitlement: {
          none: {
            EventCategory: {
              name: { equals: "Annual Leave", mode: "insensitive" },
            },
          },
        },
      },
      select: {
        id: true,
        userId: true,
        futureAnnualLeaveEntitlement: true,
        annualLeaveEntitlementDate: true,
        leaveInAdvanceUsed: true,
        employmentStartDate: true,
        startDate: true,
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        Department: {
          select: {
            id: true,
            name: true,
          },
        },
        JobRole: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        annualLeaveEntitlementDate: "asc",
      },
    });

    // Calculate days until anniversary and projected balance for each employee
    const results = employees.map((emp) => {
      const anniversaryDate = emp.annualLeaveEntitlementDate!;
      const daysUntilAnniversary = Math.ceil(
        (anniversaryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      const futureEntitlement = Number(emp.futureAnnualLeaveEntitlement || 0);
      const leaveInAdvanceUsed = Number(emp.leaveInAdvanceUsed || 0);
      const projectedBalance = Math.max(0, futureEntitlement - leaveInAdvanceUsed);
      const willBeFlagged = leaveInAdvanceUsed > futureEntitlement;

      return {
        employeeId: emp.id,
        userId: emp.userId,
        firstName: emp.User?.firstName || null,
        lastName: emp.User?.lastName || null,
        email: emp.User?.email || null,
        departmentId: emp.Department?.id || null,
        departmentName: emp.Department?.name || null,
        jobRoleId: emp.JobRole?.id || null,
        jobRoleName: emp.JobRole?.name || null,
        employmentStartDate: emp.employmentStartDate?.toISOString() || emp.startDate?.toISOString() || null,
        annualLeaveEntitlementDate: anniversaryDate.toISOString(),
        daysUntilAnniversary,
        futureAnnualLeaveEntitlement: Math.round(futureEntitlement * 100) / 100,
        leaveInAdvanceUsed: Math.round(leaveInAdvanceUsed * 100) / 100,
        projectedBalance: Math.round(projectedBalance * 100) / 100,
        willBeFlagged,
      };
    });

    return NextResponse.json({
      data: results,
      meta: {
        total: results.length,
        daysAhead,
        queryDate: today.toISOString(),
        rangeEnd: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("[upcoming-anniversaries] Error:", error);
    return NextResponse.json(
      { error: "Error fetching upcoming anniversaries" },
      { status: 500 }
    );
  }
}
