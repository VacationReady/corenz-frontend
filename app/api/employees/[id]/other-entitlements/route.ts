import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { isAdminOrManager } from "@/lib/roles";
import { formatLeaveBalance, subtractWithPrecision } from "@/lib/decimalPrecision";

export const runtime = "nodejs";

/**
 * GET /api/employees/[id]/other-entitlements
 * 
 * Returns other/custom entitlements for an employee (e.g., Time in Lieu, Study Leave)
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: employeeId } = await context.params;
    await ensurePrismaConnected();

    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 },
      );
    }

    // Verify employee exists and belongs to same company
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true },
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

    // Authorization: user can view their own or admin/manager can view any
    const sessionEmployeeId = (session.user as any).employeeId as string | undefined;
    let currentUserEmployeeId: string | undefined = sessionEmployeeId;

    // Some sessions (especially employee logins) may not include employeeId.
    // Resolve it via the linked Employee record so "self" access still works.
    if (!currentUserEmployeeId) {
      const linkedEmployee = await prisma.employee.findFirst({
        where: {
          userId: session.user.id,
          companyId: session.user.companyId,
        },
        select: { id: true },
      });
      currentUserEmployeeId = linkedEmployee?.id;
    }

    const isSelf = Boolean(currentUserEmployeeId && currentUserEmployeeId === employeeId);
    const hasPrivilege = isAdminOrManager(session);

    if (!isSelf && !hasPrivilege) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to view this employee's entitlements" },
        { status: 403 },
      );
    }

    // Fetch custom entitlements from EmployeeOtherEntitlement table
    const customEntitlements = await prisma.employeeOtherEntitlement.findMany({
      where: {
        employeeId,
        companyId: session.user.companyId,
      },
      orderBy: { name: "asc" },
    });

    // Fetch balance-required event categories and their LeaveEntitlement records
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
      orderBy: { name: "asc" },
    });

    // Get existing LeaveEntitlement records for these categories
    const categoryIds = balanceRequiredCategories.map((c) => c.id);
    const leaveEntitlements = await prisma.leaveEntitlement.findMany({
      where: {
        employeeId,
        companyId: session.user.companyId,
        eventCategoryId: { in: categoryIds },
      },
    });
    const entitlementByCategory = new Map(
      leaveEntitlements.map((e) => [e.eventCategoryId, e])
    );

    // Build category-based entitlements (auto-create if missing)
    const categoryEntitlements = [];
    for (const category of balanceRequiredCategories) {
      let entitlement = entitlementByCategory.get(category.id);
      
      // Auto-create LeaveEntitlement if it doesn't exist
      if (!entitlement) {
        entitlement = await prisma.leaveEntitlement.create({
          data: {
            id: crypto.randomUUID(),
            employeeId,
            eventCategoryId: category.id,
            companyId: session.user.companyId,
            totalDays: category.defaultBalance ?? 0,
            usedDays: 0,
            daysAllocated: category.defaultBalance ?? 0,
            carryoverDays: 0,
            updatedAt: new Date(),
          },
        });
      }

      const remaining = formatLeaveBalance(Math.max(0, subtractWithPrecision(entitlement.totalDays, entitlement.usedDays)));
      categoryEntitlements.push({
        id: entitlement.id,
        name: category.name,
        balance: remaining,
        unit: "days",
        notes: null,
        // Mark as category-based so UI can distinguish
        isEventCategory: true,
        eventCategoryId: category.id,
        totalDays: formatLeaveBalance(entitlement.totalDays),
        usedDays: formatLeaveBalance(entitlement.usedDays),
      });
    }

    // Combine custom entitlements and category-based entitlements
    const allEntitlements = [
      ...categoryEntitlements,
      ...customEntitlements.map((e) => ({
        id: e.id,
        name: e.name,
        balance: Number(e.balance),
        unit: e.unit,
        notes: e.notes,
        isEventCategory: false,
        eventCategoryId: null,
        totalDays: null,
        usedDays: null,
      })),
    ];

    return NextResponse.json({
      success: true,
      entitlements: allEntitlements,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      console.warn("[OTHER_ENTITLEMENTS_GET] Missing table EmployeeOtherEntitlement (P2021). Returning empty list.");
      return NextResponse.json(
        {
          success: true,
          entitlements: [],
          warning:
            "Other entitlements are temporarily unavailable because the database schema is out of date. Please run Prisma migrations (prisma migrate deploy).",
        },
        { status: 200 },
      );
    }
    console.error("[OTHER_ENTITLEMENTS_GET]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/employees/[id]/other-entitlements
 * 
 * Create a new other entitlement for an employee
 * Body: { name: string, balance: number, unit?: "days" | "hours", notes?: string }
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: employeeId } = await context.params;
    await ensurePrismaConnected();

    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 },
      );
    }

    // Only admin/manager can create entitlements
    if (!isAdminOrManager(session)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only admins and managers can create entitlements" },
        { status: 403 },
      );
    }

    // Verify employee exists and belongs to same company
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true },
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

    const body = await req.json();
    const { name, balance, unit = "days", notes } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 },
      );
    }

    if (typeof balance !== "number" || isNaN(balance)) {
      return NextResponse.json(
        { success: false, error: "Balance must be a valid number" },
        { status: 400 },
      );
    }

    if (!["days", "hours"].includes(unit)) {
      return NextResponse.json(
        { success: false, error: "Unit must be 'days' or 'hours'" },
        { status: 400 },
      );
    }

    // Check for duplicate name
    const existing = await prisma.employeeOtherEntitlement.findUnique({
      where: {
        employeeId_name: {
          employeeId,
          name: name.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An entitlement with this name already exists" },
        { status: 409 },
      );
    }

    const entitlement = await prisma.employeeOtherEntitlement.create({
      data: {
        employeeId,
        companyId: session.user.companyId,
        name: name.trim(),
        balance,
        unit,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      entitlement: {
        id: entitlement.id,
        name: entitlement.name,
        balance: Number(entitlement.balance),
        unit: entitlement.unit,
        notes: entitlement.notes,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      console.warn("[OTHER_ENTITLEMENTS_POST] Missing table EmployeeOtherEntitlement (P2021).");
      return NextResponse.json(
        {
          success: false,
          error:
            "Other entitlements are temporarily unavailable because the database schema is out of date. Please run Prisma migrations (prisma migrate deploy).",
        },
        { status: 503 },
      );
    }
    console.error("[OTHER_ENTITLEMENTS_POST]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/employees/[id]/other-entitlements
 * 
 * Bulk update other entitlements for an employee
 * Body: { entitlements: Array<{ id?: string, name: string, balance: number, unit?: string, notes?: string, isEventCategory?: boolean, eventCategoryId?: string }> }
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: employeeId } = await context.params;
    await ensurePrismaConnected();

    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 },
      );
    }

    if (!isAdminOrManager(session)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only admins and managers can update entitlements" },
        { status: 403 },
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true },
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

    const body = await req.json();
    const { entitlements } = body;

    if (!Array.isArray(entitlements)) {
      return NextResponse.json(
        { success: false, error: "entitlements must be an array" },
        { status: 400 },
      );
    }

    // Separate category-based entitlements from custom entitlements
    const categoryEntitlements = entitlements.filter((e) => e.isEventCategory);
    const customEntitlements = entitlements.filter((e) => !e.isEventCategory);

    // Get existing custom entitlements
    const existingCustomEntitlements = await prisma.employeeOtherEntitlement.findMany({
      where: { employeeId, companyId: session.user.companyId },
    });
    const existingCustomIds = new Set(existingCustomEntitlements.map((e) => e.id));

    // Determine which custom entitlements to delete (not in incoming list)
    const incomingCustomIds = new Set(customEntitlements.filter((e) => e.id).map((e) => e.id));
    const toDelete = existingCustomEntitlements.filter((e) => !incomingCustomIds.has(e.id));

    // Transaction to handle all changes
    await prisma.$transaction(async (tx) => {
      // Update category-based entitlements (LeaveEntitlement.totalDays)
      for (const ent of categoryEntitlements) {
        if (ent.id && ent.eventCategoryId) {
          // Update the totalDays on LeaveEntitlement
          // The balance passed is the "remaining" which equals totalDays - usedDays
          // So to set a new balance, we need: newTotalDays = newBalance + usedDays
          const existingLeaveEnt = await tx.leaveEntitlement.findUnique({
            where: { id: ent.id },
          });
          if (existingLeaveEnt) {
            const requestedRemaining = ent.balance ?? 0;
            const newTotalDays = requestedRemaining + existingLeaveEnt.usedDays;
            
            // Validation: Ensure totalDays is never less than usedDays
            // This prevents negative remaining balances which violate business logic
            if (newTotalDays < existingLeaveEnt.usedDays) {
              throw new Error(
                `Invalid balance update: Cannot set remaining balance to ${requestedRemaining} days ` +
                `when ${existingLeaveEnt.usedDays} days have already been used. ` +
                `Minimum remaining balance is 0 days.`
              );
            }
            
            await tx.leaveEntitlement.update({
              where: { id: ent.id },
              data: {
                totalDays: newTotalDays,
                daysAllocated: newTotalDays,
                updatedAt: new Date(),
              },
            });
          }
        }
      }

      // Delete removed custom entitlements
      if (toDelete.length > 0) {
        await tx.employeeOtherEntitlement.deleteMany({
          where: { id: { in: toDelete.map((e) => e.id) } },
        });
      }

      // Upsert each custom entitlement
      for (const ent of customEntitlements) {
        const name = ent.name?.trim();
        if (!name) continue;

        if (ent.id && existingCustomIds.has(ent.id)) {
          // Update existing
          await tx.employeeOtherEntitlement.update({
            where: { id: ent.id },
            data: {
              name,
              balance: ent.balance ?? 0,
              unit: ent.unit || "days",
              notes: ent.notes?.trim() || null,
            },
          });
        } else {
          // Create new
          await tx.employeeOtherEntitlement.create({
            data: {
              employeeId,
              companyId: session.user.companyId,
              name,
              balance: ent.balance ?? 0,
              unit: ent.unit || "days",
              notes: ent.notes?.trim() || null,
            },
          });
        }
      }
    });

    // Fetch updated lists and return combined result
    // Re-fetch category entitlements
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
      orderBy: { name: "asc" },
    });

    const categoryIds = balanceRequiredCategories.map((c) => c.id);
    const leaveEntitlements = await prisma.leaveEntitlement.findMany({
      where: {
        employeeId,
        companyId: session.user.companyId,
        eventCategoryId: { in: categoryIds },
      },
    });
    const entitlementByCategory = new Map(
      leaveEntitlements.map((e) => [e.eventCategoryId, e])
    );

    const updatedCategoryEntitlements = balanceRequiredCategories.map((category) => {
      const entitlement = entitlementByCategory.get(category.id);
      const remaining = entitlement ? formatLeaveBalance(Math.max(0, subtractWithPrecision(entitlement.totalDays, entitlement.usedDays))) : 0;
      return {
        id: entitlement?.id ?? category.id,
        name: category.name,
        balance: remaining,
        unit: "days",
        notes: null,
        isEventCategory: true,
        eventCategoryId: category.id,
        totalDays: formatLeaveBalance(entitlement?.totalDays ?? 0),
        usedDays: formatLeaveBalance(entitlement?.usedDays ?? 0),
      };
    });

    // Fetch updated custom entitlements
    const updatedCustom = await prisma.employeeOtherEntitlement.findMany({
      where: { employeeId, companyId: session.user.companyId },
      orderBy: { name: "asc" },
    });

    const allEntitlements = [
      ...updatedCategoryEntitlements,
      ...updatedCustom.map((e) => ({
        id: e.id,
        name: e.name,
        balance: Number(e.balance),
        unit: e.unit,
        notes: e.notes,
        isEventCategory: false,
        eventCategoryId: null,
        totalDays: null,
        usedDays: null,
      })),
    ];

    return NextResponse.json({
      success: true,
      entitlements: allEntitlements,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      console.warn("[OTHER_ENTITLEMENTS_PUT] Missing table EmployeeOtherEntitlement (P2021).");
      return NextResponse.json(
        {
          success: false,
          error:
            "Other entitlements are temporarily unavailable because the database schema is out of date. Please run Prisma migrations (prisma migrate deploy).",
        },
        { status: 503 },
      );
    }
    console.error("[OTHER_ENTITLEMENTS_PUT]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
