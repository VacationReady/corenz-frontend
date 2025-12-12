import { NextRequest, NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { getMobileSession } from "@/lib/mobile-session";

/**
 * POST /api/employees/ensure-self
 * 
 * Ensures the currently logged-in user has an Employee record.
 * This is useful for system admins who were created without an Employee record,
 * allowing them to appear in employee lists and be selected as managers.
 */
export async function POST(req: NextRequest) {
  try {
    await ensurePrismaConnected();
    const session = await getMobileSession(req);

    if (!session?.user?.id || !session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const companyId = session.user.companyId;

    // Check if employee record already exists
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        userId,
        companyId,
      },
      select: {
        id: true,
        isActive: true,
        User: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (existingEmployee) {
      // If exists but inactive, activate it
      if (!existingEmployee.isActive) {
        await prisma.employee.update({
          where: { id: existingEmployee.id },
          data: { isActive: true },
        });
        console.log(`[ensure-self] Activated existing Employee record for user ${userId}`);
        return NextResponse.json({
          success: true,
          message: "Employee record activated",
          employee: {
            id: existingEmployee.id,
            isActive: true,
            firstName: existingEmployee.User.firstName,
            lastName: existingEmployee.User.lastName,
            email: existingEmployee.User.email,
          },
          created: false,
          activated: true,
        });
      }

      // Already exists and is active
      return NextResponse.json({
        success: true,
        message: "Employee record already exists",
        employee: {
          id: existingEmployee.id,
          isActive: existingEmployee.isActive,
          firstName: existingEmployee.User.firstName,
          lastName: existingEmployee.User.lastName,
          email: existingEmployee.User.email,
        },
        created: false,
        activated: false,
      });
    }

    // Get user details to create employee record
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        departmentId: true,
        companyId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify company matches
    if (user.companyId !== companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    // Create employee record
    const employee = await prisma.employee.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        companyId: companyId,
        departmentId: user.departmentId || undefined,
        isActive: true,
        // NZ defaults
        sickLeaveDaysPerYear: 10,
        publicHolidaysPerYear: 11,
        alternativeHolidayBalance: 0,
      },
    });

    console.log(`[ensure-self] Created Employee record ${employee.id} for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: "Employee record created",
      employee: {
        id: employee.id,
        isActive: employee.isActive,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      created: true,
      activated: false,
    });
  } catch (error) {
    console.error("[ensure-self] Error:", error);
    return NextResponse.json(
      { error: "Failed to ensure employee record" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/employees/ensure-self
 * 
 * Check if the current user has an Employee record.
 */
export async function GET(req: NextRequest) {
  try {
    await ensurePrismaConnected();
    const session = await getMobileSession(req);

    if (!session?.user?.id || !session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const companyId = session.user.companyId;

    const employee = await prisma.employee.findFirst({
      where: {
        userId,
        companyId,
      },
      select: {
        id: true,
        isActive: true,
        User: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      hasEmployeeRecord: !!employee,
      isActive: employee?.isActive ?? false,
      employee: employee
        ? {
            id: employee.id,
            isActive: employee.isActive,
            firstName: employee.User.firstName,
            lastName: employee.User.lastName,
            email: employee.User.email,
            role: employee.User.role,
          }
        : null,
    });
  } catch (error) {
    console.error("[ensure-self] Error checking employee record:", error);
    return NextResponse.json(
      { error: "Failed to check employee record" },
      { status: 500 }
    );
  }
}












