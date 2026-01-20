import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-session";
import {
  canAccessLeaveRequests,
  createAuthContext,
} from "@/lib/authz";
import { formatLeaveBalance, subtractWithPrecision } from "@/lib/decimalPrecision";
import { 
  decimalToNumber, 
  DEFAULT_HOURS_PER_DAY,
  daysToHours,
  isLeaveHoursEnabled,
} from "@/lib/leave/hours-conversion";

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

    // 1. Authentication - support both web and mobile clients
    const session = await getMobileSession(req);
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
        isActive: true,
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

    // 5. Auto-create missing entitlements for balance-required categories
    // This ensures employees see all configured leave types, even if categories
    // were added after the employee was created
    // NZ HRIS Compliance: Only create entitlements for ACTIVE employees
    // Inactive/terminated employees should not accrue new leave entitlements
    const balanceRequiredCategories = await prisma.eventCategory.findMany({
      where: {
        companyId: session.user.companyId,
        isActive: true,
        balanceRequired: true,
      },
      select: {
        id: true,
        name: true,
        defaultBalance: true,
      },
    });

    // Check which entitlements already exist
    const existingEntitlements = await prisma.leaveEntitlement.findMany({
      where: {
        employeeId,
        companyId: session.user.companyId,
        eventCategoryId: { in: balanceRequiredCategories.map((c) => c.id) },
      },
      select: { eventCategoryId: true },
    });

    const existingCategoryIds = new Set(existingEntitlements.map((e) => e.eventCategoryId));
    const missingCategories = balanceRequiredCategories.filter(
      (c) => !existingCategoryIds.has(c.id)
    );

    // Auto-create missing entitlements ONLY for active employees
    // This prevents database pollution and maintains NZ compliance
    if (missingCategories.length > 0 && employee.isActive) {
      const entitlementsToCreate = missingCategories.map((category) => ({
        id: crypto.randomUUID(),
        employeeId,
        eventCategoryId: category.id,
        companyId: session.user.companyId,
        totalDays: category.defaultBalance || 0,
        usedDays: 0,
        carryoverDays: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await prisma.leaveEntitlement.createMany({
        data: entitlementsToCreate,
        skipDuplicates: true,
      });

      console.log(
        `[LEAVE_BALANCES_GET] Auto-created ${entitlementsToCreate.length} missing entitlements for active employee ${employeeId}`
      );
    } else if (missingCategories.length > 0 && !employee.isActive) {
      console.log(
        `[LEAVE_BALANCES_GET] Skipped auto-creating ${missingCategories.length} entitlements for inactive employee ${employeeId}`
      );
    }

    // 5b. Fetch leave entitlements with category information
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
    // Use partial matching to handle variations like "Annual Leave", "Sick Leave", "Sickness"
    const isCoreLeaveType = (name: string): boolean => {
      const normalized = name.toLowerCase();
      return normalized.includes("annual") || 
             normalized.includes("sick") || 
             normalized.includes("alternative day");
    };
    
    const otherEntitlementCategoryIds = new Set(
      entitlements
        .filter((e) => {
          return (e.EventCategory as any).balanceRequired && !isCoreLeaveType(e.EventCategory.name);
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

    // Get company configuration for hours-based tracking
    let companyDefaultHours = DEFAULT_HOURS_PER_DAY;
    let hoursEnabled = false;
    try {
      const company = await prisma.company.findUnique({
        where: { id: session.user.companyId },
      });
      const companyWithConfig = company as typeof company & { 
        defaultHoursPerDay?: any;
        leaveHoursEnabled?: boolean;
      };
      if (companyWithConfig?.defaultHoursPerDay) {
        companyDefaultHours = decimalToNumber(companyWithConfig.defaultHoursPerDay, DEFAULT_HOURS_PER_DAY);
      }
      // Check feature flag - only include hours data when enabled
      hoursEnabled = isLeaveHoursEnabled(companyWithConfig);
    } catch {
      // Fields don't exist yet, use defaults
    }

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
      // Hours-based tracking (NZ Holidays Act 2003 compliance)
      remainingHours?: number;
      usedHours?: number;
      totalHours?: number | null;
      carryoverHours?: number;
      hoursPerDay?: number;
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
      
      // Base balance item (always included)
      const balanceItem: BalanceItem = {
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
      };

      // Only include hours data when feature flag is enabled
      // This ensures existing tenants see no change until they opt-in
      if (hoursEnabled) {
        const entWithHours = ent as typeof ent & { totalHours?: any; usedHours?: any; carryoverHours?: any };
        const totalHours = entWithHours.totalHours 
          ? decimalToNumber(entWithHours.totalHours, ent.totalDays * companyDefaultHours)
          : ent.totalDays * companyDefaultHours;
        const usedHours = entWithHours.usedHours
          ? decimalToNumber(entWithHours.usedHours, ent.usedDays * companyDefaultHours)
          : ent.usedDays * companyDefaultHours;
        const carryoverHours = entWithHours.carryoverHours
          ? decimalToNumber(entWithHours.carryoverHours, ent.carryoverDays * companyDefaultHours)
          : ent.carryoverDays * companyDefaultHours;
        const remainingHours = Math.max(0, totalHours - usedHours);
        
        balanceItem.remainingHours = formatLeaveBalance(remainingHours);
        balanceItem.usedHours = formatLeaveBalance(usedHours);
        balanceItem.totalHours = formatLeaveBalance(totalHours);
        balanceItem.carryoverHours = formatLeaveBalance(carryoverHours);
        balanceItem.hoursPerDay = companyDefaultHours;
      }
      
      balances.push(balanceItem);
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
      // Support both new leaveType field and legacy EventCategory-based sick leave
      const pendingSickCount = await prisma.leaveRequest.count({
        where: {
          employeeId,
          companyId: session.user.companyId,
          approvalStatus: "PENDING",
          OR: [
            { leaveType: "SICK" },
            { EventCategory: { name: { contains: "sick", mode: "insensitive" } } },
          ],
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
      // Support multiple naming patterns for annual leave categories
      const pendingAnnualCount = await prisma.leaveRequest.count({
        where: {
          employeeId,
          companyId: session.user.companyId,
          approvalStatus: "PENDING",
          OR: [
            { leaveType: "ANNUAL" },
            { EventCategory: { name: { contains: "Annual", mode: "insensitive" } } },
            { EventCategory: { name: { contains: "Holiday", mode: "insensitive" } } },
          ],
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

    // Add alternative days balance (always show, even when 0, for consistent UI)
    // NZ HRIS: Display all leave types consistently so employees understand their entitlements
    if (employee.alternativeDaysBalance !== null && employee.alternativeDaysBalance !== undefined) {
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
