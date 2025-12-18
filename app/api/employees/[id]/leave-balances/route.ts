import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import {
  canAccessLeaveRequests,
  createAuthContext,
} from "@/lib/authz";

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
    const entitlements = await prisma.leaveEntitlement.findMany({
      where: {
        employeeId,
        companyId: session.user.companyId,
      },
      include: {
        EventCategory: {
          select: {
            id: true,
            name: true,
            iconKey: true,
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

    // 5b. Find EventCategories with balanceRequired=true that don't have entitlements yet
    // and auto-create LeaveEntitlement records with the default balance
    // Note: balanceRequired, defaultBalance, balanceRefreshMonths fields require prisma generate after migration
    const existingCategoryIds = new Set(entitlements.map((e) => e.eventCategoryId));
    
    // Use raw query to avoid TypeScript errors before prisma generate
    const balanceRequiredCategories = await (prisma.eventCategory.findMany as any)({
      where: {
        companyId: session.user.companyId,
        isActive: true,
        balanceRequired: true,
        id: { notIn: Array.from(existingCategoryIds) },
      },
      select: {
        id: true,
        name: true,
        iconKey: true,
        defaultBalance: true,
        balanceRefreshMonths: true,
      },
    }) as Array<{ id: string; name: string; iconKey: string | null; defaultBalance: number | null; balanceRefreshMonths: number | null }>;

    // Auto-create entitlements for balance-required categories
    const newEntitlements: EntitlementWithCategory[] = [];
    for (const category of balanceRequiredCategories) {
      const defaultDays = category.defaultBalance ?? 0;
      
      // Create the entitlement record
      const newEntitlement = await prisma.leaveEntitlement.create({
        data: {
          id: crypto.randomUUID(),
          employeeId,
          eventCategoryId: category.id,
          companyId: session.user.companyId,
          totalDays: defaultDays,
          usedDays: 0,
          daysAllocated: defaultDays,
          carryoverDays: 0,
          updatedAt: new Date(),
        },
      });

      newEntitlements.push({
        id: newEntitlement.id,
        eventCategoryId: newEntitlement.eventCategoryId,
        totalDays: newEntitlement.totalDays,
        usedDays: newEntitlement.usedDays,
        carryoverDays: newEntitlement.carryoverDays,
        carryoverExpiry: newEntitlement.carryoverExpiry,
        EventCategory: {
          id: category.id,
          name: category.name,
          iconKey: category.iconKey,
        },
      });
    }

    // Combine existing and newly created entitlements
    const allEntitlements: EntitlementWithCategory[] = [
      ...entitlements.map((e) => ({
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
      })),
      ...newEntitlements,
    ];

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
    }

    const balances: BalanceItem[] = [];

    // Add entitlements from LeaveEntitlement table (including auto-created ones)
    for (const ent of allEntitlements) {
      const remaining = Math.max(0, ent.totalDays - ent.usedDays);
      balances.push({
        id: ent.id,
        type: "entitlement",
        categoryId: ent.eventCategoryId,
        categoryName: ent.EventCategory.name,
        categoryIconKey: ent.EventCategory.iconKey ?? null,
        remaining,
        used: ent.usedDays,
        total: ent.totalDays,
        pending: pendingCountMap.get(ent.eventCategoryId) ?? 0,
        carryover: ent.carryoverDays,
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
      const sickDays = sickBalance / 8;
      balances.push({
        id: `stored-sick-${employeeId}`,
        type: "stored",
        categoryId: null,
        categoryName: "Sick Leave",
        categoryIconKey: "thermometer",
        remaining: sickDays,
        used: 0, // We don't track used for stored balances
        total: null, // Stored balance - no explicit total
        pending: 0,
        carryover: 0,
        carryoverExpiry: null,
      });
    }

    // Check if annual leave is already covered by entitlements
    const hasAnnualEntitlement = balances.some(
      (b) => b.categoryName.toLowerCase().includes("annual")
    );

    // Add stored annual leave balance if not covered by entitlements
    if (!hasAnnualEntitlement && employee.annualLeaveBalance !== null) {
      const annualBalance = Number(employee.annualLeaveBalance);
      // Convert hours to days (8 hours per day per NZ standard)
      const annualDays = annualBalance / 8;
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
