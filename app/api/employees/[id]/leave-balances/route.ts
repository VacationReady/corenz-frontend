import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import {
  canAccessLeaveRequests,
  createAuthContext,
} from "@/lib/authz";
import { formatLeaveBalance, subtractWithPrecision } from "@/lib/decimalPrecision";

export const runtime = "nodejs";

/**
 * GET /api/employees/[id]/leave-balances
 * 
 * Returns leave balances for an employee including:
 * - Leave entitlements by category (from LeaveEntitlement table)
 * - Stored balances from Employee record (annualLeaveBalance, sickLeaveBalance)
 * 
 * Response shape matches a normalized list to allow UI to render consistently.
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

    // 3. Verify employee exists and belongs to same company (tenant isolation)
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        companyId: true,
        annualLeaveBalance: true,
        sickLeaveBalance: true,
        alternativeDaysBalance: true,
        // NZ Holidays Act 2003 compliance fields
        futureAnnualLeaveEntitlement: true,
        annualLeaveEntitlementDate: true,
        leaveInAdvanceUsed: true,
        isCasualEmployee: true,
        startDate: true,
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

    // 4. Authorization check
    const hasAccess = await canAccessLeaveRequests(authContext, employeeId);
    if (!hasAccess) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden: You do not have permission to view this employee's leave balances" 
        },
        { status: 403 },
      );
    }

    // 5. Fetch leave entitlements with category information
    // Only fetch entitlements for categories that have balanceRequired=true
    // OR are Annual Leave/Sickness (core leave types that always show)
    const entitlements = await prisma.leaveEntitlement.findMany({
      where: {
        employeeId,
        companyId: session.user.companyId,
        EventCategory: {
          isActive: true,
          OR: [
            { balanceRequired: true },
            { name: { in: ["Annual Leave", "Sickness", "Sick Leave"] } },
          ],
        },
      },
      include: {
        EventCategory: {
          select: {
            id: true,
            name: true,
            iconKey: true,
            balanceRequired: true,
          },
        },
      },
      orderBy: {
        EventCategory: {
          name: "asc",
        },
      },
    });

    // Define a unified type for entitlements with their category info
    type EntitlementWithCategory = {
      id: string;
      eventCategoryId: string;
      totalDays: number;
      usedDays: number;
      carryoverDays: number;
      carryoverExpiry?: Date | null;
      EventCategory: {
        id: string;
        name: string;
        iconKey: string | null;
      };
    };

    // 5b. Get category IDs that go to "Other Entitlements" section
    // These are categories with balanceRequired=true that are NOT core leave types
    const coreLeaveNames = ["annual leave", "sickness", "sick leave"];
    const otherEntitlementCategoryIds = new Set(
      entitlements
        .filter((e) => {
          const name = e.EventCategory.name.toLowerCase();
          return (e.EventCategory as any).balanceRequired && !coreLeaveNames.includes(name);
        })
        .map((e) => e.eventCategoryId)
    );

    // Filter to only show core leave types as main balance cards
    // Other balanceRequired categories go to "Other Entitlements"
    const filteredEntitlements = entitlements.filter(
      (e) => !otherEntitlementCategoryIds.has(e.eventCategoryId)
    );

    // Map to unified type
    const allEntitlements: EntitlementWithCategory[] = filteredEntitlements.map((e) => ({
      id: e.id,
      eventCategoryId: e.eventCategoryId,
      totalDays: e.totalDays,
      usedDays: e.usedDays,
      carryoverDays: e.carryoverDays,
      carryoverExpiry: e.carryoverExpiry,
      EventCategory: {
        id: e.EventCategory.id,
        name: e.EventCategory.name,
        iconKey: e.EventCategory.iconKey,
      },
    }));

    // 6. Calculate pending leave for each category
    const pendingByCategory = await prisma.leaveRequest.groupBy({
      by: ["eventCategoryId"],
      where: {
        employeeId,
        companyId: session.user.companyId,
        approvalStatus: "PENDING",
      },
      _count: {
        id: true,
      },
    });
    
    const pendingCountMap = new Map(
      pendingByCategory.map((p) => [p.eventCategoryId, p._count.id])
    );

    // 7. Build normalized response
    interface BalanceItem {
      id: string;
      type: "entitlement" | "stored";
      categoryId: string | null;
      categoryName: string;
      categoryIconKey: string | null;
      remaining: number;
      used: number;
      total: number | null; // Only shown when derived from explicit entitlement
      pending: number;
      carryover: number;
      carryoverExpiry: string | null;
      // NZ Holidays Act 2003 compliance fields (for annual leave)
      isUnearned?: boolean;
      futureEntitlement?: number | null;
      entitlementDate?: string | null;
      leaveInAdvanceUsed?: number;
    }

    const balances: BalanceItem[] = [];
    
    // Determine if employee is pre-12-month (NZ Holidays Act 2003)
    const futureEntitlement = employee.futureAnnualLeaveEntitlement 
      ? Number(employee.futureAnnualLeaveEntitlement) 
      : null;
    const entitlementDate = employee.annualLeaveEntitlementDate;
    const leaveInAdvanceUsed = Number(employee.leaveInAdvanceUsed || 0);
    const isCasual = employee.isCasualEmployee ?? false;
    
    // Employee is pre-12-month if:
    // 1. They have a futureAnnualLeaveEntitlement stored, OR
    // 2. Their annualLeaveEntitlementDate is in the future
    const isPreTwelveMonth = !isCasual && (
      futureEntitlement !== null ||
      (entitlementDate && new Date(entitlementDate) > new Date())
    );

    // Add entitlements from LeaveEntitlement table (including auto-created ones)
    for (const ent of allEntitlements) {
      const remaining = formatLeaveBalance(Math.max(0, subtractWithPrecision(ent.totalDays, ent.usedDays)));
      balances.push({
        id: ent.id,
        type: "entitlement",
        categoryId: ent.eventCategoryId,
        categoryName: ent.EventCategory.name,
        categoryIconKey: ent.EventCategory.iconKey ?? null,
        remaining,
        used: formatLeaveBalance(ent.usedDays),
        total: formatLeaveBalance(ent.totalDays),
        pending: pendingCountMap.get(ent.eventCategoryId) ?? 0,
        carryover: formatLeaveBalance(ent.carryoverDays),
        carryoverExpiry: (ent as any).carryoverExpiry?.toISOString() ?? null,
      });
    }

    // Check if sick leave is already covered by entitlements
    const hasSickEntitlement = balances.some(
      (b) => b.categoryName.toLowerCase().includes("sick")
    );

    // Add stored sick leave balance if not covered by entitlements
    if (!hasSickEntitlement && employee.sickLeaveBalance !== null) {
      const sickBalance = Number(employee.sickLeaveBalance);
      // Convert hours to days (8 hours per day per NZ standard)
      const sickDays = formatLeaveBalance(sickBalance / 8);
      
      // Calculate used sick leave from ledger USAGE entries
      const sickLeaveUsage = await prisma.leaveBalanceLedger.aggregate({
        where: {
          employeeId,
          leaveType: "SICK_LEAVE",
          eventType: "USAGE",
        },
        _sum: {
          deltaHours: true,
        },
      });
      // deltaHours is negative for usage, so we negate to get positive used value
      const usedHours = Math.abs(Number(sickLeaveUsage._sum.deltaHours || 0));
      const usedDays = formatLeaveBalance(usedHours / 8);
      
      // Count pending sick leave requests
      const pendingSickCount = await prisma.leaveRequest.count({
        where: {
          employeeId,
          companyId: session.user.companyId,
          leaveType: "SICK",
          approvalStatus: "PENDING",
        },
      });
      
      balances.push({
        id: `stored-sick-${employeeId}`,
        type: "stored",
        categoryId: null,
        categoryName: "Sick Leave",
        categoryIconKey: "thermometer",
        remaining: sickDays,
        used: usedDays,
        total: null, // Stored balance - no explicit total
        pending: pendingSickCount,
        carryover: 0,
        carryoverExpiry: null,
      });
    }

    // Check if annual leave is already covered by entitlements
    const hasAnnualEntitlement = balances.some(
      (b) => b.categoryName.toLowerCase().includes("annual")
    );

    // NZ Holidays Act 2003: Add unearned annual leave for pre-12-month employees
    // These employees have not yet reached their entitlement crystallisation date
    if (!hasAnnualEntitlement && isPreTwelveMonth && futureEntitlement !== null) {
      // Calculate remaining unearned balance (future entitlement minus leave in advance used)
      const remainingUnearned = formatLeaveBalance(Math.max(0, futureEntitlement - leaveInAdvanceUsed));
      
      // Count pending annual leave requests
      const pendingAnnualCount = await prisma.leaveRequest.count({
        where: {
          employeeId,
          companyId: session.user.companyId,
          approvalStatus: "PENDING",
          EventCategory: {
            name: { contains: "Annual", mode: "insensitive" },
          },
        },
      });
      
      balances.push({
        id: `unearned-annual-${employeeId}`,
        type: "stored",
        categoryId: null,
        categoryName: "Annual Leave",
        categoryIconKey: "palmtree",
        remaining: remainingUnearned,
        used: formatLeaveBalance(leaveInAdvanceUsed),
        total: formatLeaveBalance(futureEntitlement),
        pending: pendingAnnualCount,
        carryover: 0,
        carryoverExpiry: null,
        // NZ compliance fields
        isUnearned: true,
        futureEntitlement: formatLeaveBalance(futureEntitlement),
        entitlementDate: entitlementDate?.toISOString() ?? null,
        leaveInAdvanceUsed: formatLeaveBalance(leaveInAdvanceUsed),
      });
    }
    // Add stored annual leave balance if not covered by entitlements (post-12-month fallback)
    else if (!hasAnnualEntitlement && employee.annualLeaveBalance !== null) {
      const annualBalance = Number(employee.annualLeaveBalance);
      // Convert hours to days (8 hours per day per NZ standard)
      const annualDays = formatLeaveBalance(annualBalance / 8);
      balances.push({
        id: `stored-annual-${employeeId}`,
        type: "stored",
        categoryId: null,
        categoryName: "Annual Leave",
        categoryIconKey: "palmtree",
        remaining: annualDays,
        used: 0,
        total: null, // Stored balance - no explicit total
        pending: 0,
        carryover: 0,
        carryoverExpiry: null,
      });
    }

    // Add alternative days if any
    if (employee.alternativeDaysBalance > 0) {
      balances.push({
        id: `stored-alt-${employeeId}`,
        type: "stored",
        categoryId: null,
        categoryName: "Alternative Days",
        categoryIconKey: "calendar",
        remaining: employee.alternativeDaysBalance,
        used: 0,
        total: null,
        pending: 0,
        carryover: 0,
        carryoverExpiry: null,
      });
    }

    return NextResponse.json({
      success: true,
      balances,
    });
  } catch (error) {
    console.error("[LEAVE_BALANCES_GET]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
