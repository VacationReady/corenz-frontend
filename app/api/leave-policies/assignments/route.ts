import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET: Fetch leave policy assignments
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const leavePolicyId = searchParams.get("leavePolicyId");
    const employeeId = searchParams.get("employeeId");

    const where = {
      companyId: session.user.companyId,
      ...(leavePolicyId && { leavePolicyId }),
    };

    // If checking for a specific employee, filter assignments that apply to them
    if (employeeId) {
      const employee = await prisma.employee.findFirst({
        where: {
          id: employeeId,
          companyId: session.user.companyId,
        },
        select: {
          departmentId: true,
          jobRoleId: true,
          locationId: true,
        },
      });

      if (!employee) {
        return NextResponse.json(
          { error: "Employee not found" },
          { status: 404 },
        );
      }

      // Find assignments that apply to this employee
      const assignments = await prisma.leavePolicyAssignment.findMany({
        where: {
          companyId: session.user.companyId,
          AND: [
            {
              OR: [
                { employeeIds: { has: employeeId } },
                ...(employee.departmentId
                  ? [{ departmentIds: { has: employee.departmentId } }]
                  : []),
                ...(employee.jobRoleId
                  ? [{ jobRoleIds: { has: employee.jobRoleId } }]
                  : []),
                ...(employee.locationId
                  ? [{ locationIds: { has: employee.locationId } }]
                  : []),
              ],
            },
            { effectiveFrom: { lte: new Date() } },
            {
              OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
            },
          ],
        },
        include: {
          leavePolicy: {
            include: {
              EventCategory: {
                select: { id: true, name: true, color: true },
              },
            },
          },
        },
        orderBy: [
          { priority: "desc" }, // Higher priority first
          { effectiveFrom: "desc" },
        ],
      });

      return NextResponse.json(assignments);
    }

    // General assignment listing
    const assignments = await prisma.leavePolicyAssignment.findMany({
      where,
      include: {
        leavePolicy: {
          include: {
            EventCategory: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
      orderBy: [{ priority: "desc" }, { effectiveFrom: "desc" }],
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error fetching leave policy assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST: Create a new leave policy assignment
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      leavePolicyId,
      departmentIds = [],
      jobRoleIds = [],
      locationIds = [],
      employeeIds = [],
      priority = 0,
      effectiveFrom,
      effectiveTo,
    } = body;

    // Validation
    if (!leavePolicyId || !effectiveFrom) {
      return NextResponse.json(
        { error: "Missing required fields: leavePolicyId, effectiveFrom" },
        { status: 400 },
      );
    }

    // At least one assignment target must be specified
    if (
      departmentIds.length === 0 &&
      jobRoleIds.length === 0 &&
      locationIds.length === 0 &&
      employeeIds.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "At least one assignment target must be specified (departments, job roles, locations, or employees)",
        },
        { status: 400 },
      );
    }

    // Verify leave policy exists and belongs to company
    const leavePolicy = await prisma.leavePolicy.findFirst({
      where: {
        id: leavePolicyId,
        companyId: session.user.companyId,
      },
    });

    if (!leavePolicy) {
      return NextResponse.json(
        { error: "Invalid leave policy" },
        { status: 400 },
      );
    }

    // Validate department IDs
    if (departmentIds.length > 0) {
      const validDepartments = await prisma.department.count({
        where: {
          id: { in: departmentIds },
          companyId: session.user.companyId,
        },
      });
      if (validDepartments !== departmentIds.length) {
        return NextResponse.json(
          { error: "One or more invalid department IDs" },
          { status: 400 },
        );
      }
    }

    // Validate job role IDs
    if (jobRoleIds.length > 0) {
      const validJobRoles = await prisma.jobRole.count({
        where: {
          id: { in: jobRoleIds },
          companyId: session.user.companyId,
        },
      });
      if (validJobRoles !== jobRoleIds.length) {
        return NextResponse.json(
          { error: "One or more invalid job role IDs" },
          { status: 400 },
        );
      }
    }

    // Validate employee IDs
    if (employeeIds.length > 0) {
      const validEmployees = await prisma.employee.count({
        where: {
          id: { in: employeeIds },
          companyId: session.user.companyId,
        },
      });
      if (validEmployees !== employeeIds.length) {
        return NextResponse.json(
          { error: "One or more invalid employee IDs" },
          { status: 400 },
        );
      }
    }

    const assignment = await prisma.leavePolicyAssignment.create({
      data: {
        companyId: session.user.companyId,
        leavePolicyId,
        departmentIds,
        jobRoleIds,
        locationIds,
        employeeIds,
        priority,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      },
      include: {
        leavePolicy: {
          include: {
            EventCategory: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("Error creating leave policy assignment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

