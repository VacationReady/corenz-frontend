import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { format } from "date-fns";
import {
  getSickLeaveStatus,
  applySickLeaveGrants,
  SICK_LEAVE_CAP_DAYS,
  HOURS_PER_DAY,
} from "@/lib/leave/nz-sick-leave-ledger";
import {
  canAccessLeaveRequests,
  createAuthContext,
} from "@/lib/authz";

export const runtime = "nodejs";

/**
 * GET /api/employees/[id]/sick-leave-status
 * 
 * Returns the sick leave status for an employee including:
 * - availableDays: Current sick leave balance
 * - isEligibleToday: Whether employee is eligible for sick leave
 * - eligibleFrom: Date when employee becomes eligible (if not yet)
 * - nextGrantDate: Date of next 10-day grant
 * - capDays: Maximum accumulation (20 days per NZ law)
 * - dayLengthHours: Standard hours per day (8)
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: employeeId } = await context.params;
    await ensurePrismaConnected();

    // 1. Authentication
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 },
      );
    }

    // 2. Create auth context
    const authContext = createAuthContext(session);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 },
      );
    }

    // 3. Verify employee exists and belongs to same company
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true, userId: true },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 },
      );
    }

    if (employee.companyId !== session.user.companyId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Cross-tenant access denied" },
        { status: 403 },
      );
    }

    // 4. Authorization check
    const hasAccess = await canAccessLeaveRequests(authContext, employeeId);
    if (!hasAccess) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden: You do not have permission to view this employee's sick leave status" 
        },
        { status: 403 },
      );
    }

    // 5. Apply any pending sick leave grants (lazy on-read)
    try {
      await applySickLeaveGrants(prisma as any, employeeId, new Date());
    } catch (error) {
      console.error("[SickLeaveStatus] Failed to apply grants:", error);
      // Continue - we can still return current status
    }

    // 6. Fetch updated employee with sick leave fields
    const employeeWithSickLeave = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        companyId: true,
        employmentStartDate: true,
        startDate: true,
        sickLeaveBalance: true,
        sickLeaveEligibilityDate: true,
        sickLeaveLastGrantDate: true,
      },
    });

    if (!employeeWithSickLeave) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 },
      );
    }

    // 7. Compute sick leave status
    const status = getSickLeaveStatus(employeeWithSickLeave as any, new Date());

    // 8. Return response in the expected shape
    return NextResponse.json({
      availableDays: status.balanceDays,
      isEligibleToday: status.isEligible,
      eligibleFrom: status.eligibilityDate ? format(status.eligibilityDate, "yyyy-MM-dd") : null,
      nextGrantDate: status.nextGrantDate ? format(status.nextGrantDate, "yyyy-MM-dd") : null,
      capDays: SICK_LEAVE_CAP_DAYS,
      dayLengthHours: HOURS_PER_DAY,
    });
  } catch (error) {
    console.error("[SICK_LEAVE_STATUS_GET]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
