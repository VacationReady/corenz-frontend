import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// PUT: Update a leave policy assignment
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      departmentIds = [],
      jobRoleIds = [],
      locationIds = [],
      employeeIds = [],
      priority = 0,
      effectiveFrom,
      effectiveTo
    } = body;

    // Check if assignment exists and belongs to company
    const existingAssignment = await prisma.leavePolicyAssignment.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId
      }
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Leave policy assignment not found" },
        { status: 404 }
      );
    }

    // Validation
    if (!effectiveFrom) {
      return NextResponse.json(
        { error: "Missing required field: effectiveFrom" },
        { status: 400 }
      );
    }

    // At least one assignment target must be specified
    if (departmentIds.length === 0 && jobRoleIds.length === 0 && 
        locationIds.length === 0 && employeeIds.length === 0) {
      return NextResponse.json(
        { error: "At least one assignment target must be specified" },
        { status: 400 }
      );
    }

    // Validate department IDs
    if (departmentIds.length > 0) {
      const validDepartments = await prisma.department.count({
        where: {
          id: { in: departmentIds },
          companyId: session.user.companyId
        }
      });
      if (validDepartments !== departmentIds.length) {
        return NextResponse.json(
          { error: "One or more invalid department IDs" },
          { status: 400 }
        );
      }
    }

    // Validate job role IDs
    if (jobRoleIds.length > 0) {
      const validJobRoles = await prisma.jobRole.count({
        where: {
          id: { in: jobRoleIds },
          companyId: session.user.companyId
        }
      });
      if (validJobRoles !== jobRoleIds.length) {
        return NextResponse.json(
          { error: "One or more invalid job role IDs" },
          { status: 400 }
        );
      }
    }

    // Validate employee IDs
    if (employeeIds.length > 0) {
      const validEmployees = await prisma.employee.count({
        where: {
          id: { in: employeeIds },
          companyId: session.user.companyId
        }
      });
      if (validEmployees !== employeeIds.length) {
        return NextResponse.json(
          { error: "One or more invalid employee IDs" },
          { status: 400 }
        );
      }
    }

    const updatedAssignment = await prisma.leavePolicyAssignment.update({
      where: { id: params.id },
      data: {
        departmentIds,
        jobRoleIds,
        locationIds,
        employeeIds,
        priority,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null
      },
      include: {
        leavePolicy: {
          include: {
            eventCategory: {
              select: { id: true, name: true, color: true }
            }
          }
        }
      }
    });

    return NextResponse.json(updatedAssignment);
  } catch (error) {
    console.error("Error updating leave policy assignment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a leave policy assignment
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if assignment exists and belongs to company
    const existingAssignment = await prisma.leavePolicyAssignment.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId
      }
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Leave policy assignment not found" },
        { status: 404 }
      );
    }

    await prisma.leavePolicyAssignment.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      message: "Leave policy assignment deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting leave policy assignment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
