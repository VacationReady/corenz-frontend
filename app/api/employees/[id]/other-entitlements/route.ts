import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { isAdminOrManager } from "@/lib/roles";

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
    const currentUserEmployeeId = (session.user as any).employeeId;
    const isSelf = currentUserEmployeeId === employeeId;
    const hasPrivilege = isAdminOrManager(session);

    if (!isSelf && !hasPrivilege) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to view this employee's entitlements" },
        { status: 403 },
      );
    }

    const entitlements = await prisma.employeeOtherEntitlement.findMany({
      where: {
        employeeId,
        companyId: session.user.companyId,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      entitlements: entitlements.map((e) => ({
        id: e.id,
        name: e.name,
        balance: Number(e.balance),
        unit: e.unit,
        notes: e.notes,
      })),
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
 * Body: { entitlements: Array<{ id?: string, name: string, balance: number, unit?: string, notes?: string }> }
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

    // Get existing entitlements
    const existingEntitlements = await prisma.employeeOtherEntitlement.findMany({
      where: { employeeId, companyId: session.user.companyId },
    });
    const existingIds = new Set(existingEntitlements.map((e) => e.id));

    // Determine which to create, update, or delete
    const incomingIds = new Set(entitlements.filter((e) => e.id).map((e) => e.id));
    const toDelete = existingEntitlements.filter((e) => !incomingIds.has(e.id));

    // Transaction to handle all changes
    await prisma.$transaction(async (tx) => {
      // Delete removed entitlements
      if (toDelete.length > 0) {
        await tx.employeeOtherEntitlement.deleteMany({
          where: { id: { in: toDelete.map((e) => e.id) } },
        });
      }

      // Upsert each entitlement
      for (const ent of entitlements) {
        const name = ent.name?.trim();
        if (!name) continue;

        if (ent.id && existingIds.has(ent.id)) {
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

    // Fetch updated list
    const updated = await prisma.employeeOtherEntitlement.findMany({
      where: { employeeId, companyId: session.user.companyId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      entitlements: updated.map((e) => ({
        id: e.id,
        name: e.name,
        balance: Number(e.balance),
        unit: e.unit,
        notes: e.notes,
      })),
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
