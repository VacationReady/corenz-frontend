import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { isAdminOrManager } from "@/lib/roles";

export const runtime = "nodejs";

/**
 * PUT /api/employees/[id]/annual-leave-balance
 * 
 * Updates the annual leave balance for an employee.
 * Only admins and managers can update balances.
 * 
 * Body: { balanceDays: number, reason: string }
 */
export async function PUT(
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

    // 2. Authorization - only admin/manager can update balances
    if (!isAdminOrManager(session)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden: Only admins and managers can update leave balances" 
        },
        { status: 403 },
      );
    }

    // 3. Verify employee exists and belongs to same company (tenant isolation)
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        companyId: true,
        annualLeaveBalance: true,
      },
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

    // 4. Parse and validate request body
    const body = await req.json();
    const { balanceDays, reason } = body;

    if (typeof balanceDays !== 'number' || isNaN(balanceDays)) {
      return NextResponse.json(
        { success: false, error: "balanceDays must be a valid number" },
        { status: 400 },
      );
    }

    if (balanceDays < 0) {
      return NextResponse.json(
        { success: false, error: "Balance cannot be negative" },
        { status: 400 },
      );
    }

    if (balanceDays > 200) {
      return NextResponse.json(
        { success: false, error: "Balance exceeds maximum allowed value (200 days)" },
        { status: 400 },
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Reason is required for balance adjustments" },
        { status: 400 },
      );
    }

    // 5. Convert days to hours (NZ standard: 8 hours per day)
    const HOURS_PER_DAY = 8;
    const balanceHours = balanceDays * HOURS_PER_DAY;
    const oldBalanceHours = Number(employee.annualLeaveBalance || 0);
    const oldBalanceDays = oldBalanceHours / HOURS_PER_DAY;

    // 6. Update employee balance and create audit log in a transaction
    await prisma.$transaction(async (tx) => {
      // Update the balance
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          annualLeaveBalance: balanceHours,
          leaveBalanceLastUpdated: new Date(),
        },
      });

      // Create audit log entry
      await tx.employeeAuditLog.create({
        data: {
          id: crypto.randomUUID(),
          companyId: session.user.companyId!,
          employeeId,
          section: 'leave-balance',
          field: 'annualLeaveBalance',
          oldValue: `${oldBalanceDays.toFixed(1)} days (${oldBalanceHours.toFixed(2)} hours)`,
          newValue: `${balanceDays.toFixed(1)} days (${balanceHours.toFixed(2)} hours)`,
          reason: reason.trim(),
          changedById: session.user.id,
          changedAt: new Date(),
        },
      });
    });

    // 7. Return success response
    return NextResponse.json({
      success: true,
      balance: {
        days: balanceDays,
        hours: balanceHours,
        previousDays: oldBalanceDays,
        previousHours: oldBalanceHours,
      },
      message: 'Annual leave balance updated successfully',
    });

  } catch (error) {
    console.error("[ANNUAL_LEAVE_BALANCE_PUT]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
