import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canAccessEmployee } from "@/lib/permissions";

/**
 * GET /api/employees/[id]/summary
 * Returns lightweight employee summary for headers/breadcrumbs
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: {
        id,
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        User: {
          select: {
            firstName: true,
            lastName: true,
            profileImageUrl: true,
          },
        },
        JobRole: {
          select: {
            name: true,
          },
        },
        Department: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    // Access control
    const allowed = await canAccessEmployee(
      {
        id: session.user.id,
        role: session.user.role as any,
        companyId: session.user.companyId,
      },
      id
    );

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // Return lightweight summary
    const summary = {
      id: employee.id,
      firstName: employee.User?.firstName || "",
      lastName: employee.User?.lastName || "",
      fullName:
        `${employee.User?.firstName || ""} ${employee.User?.lastName || ""}`.trim() ||
        "Unknown Employee",
      title: employee.JobRole?.name || null,
      department: employee.Department?.name || null,
      photoUrl: employee.User?.profileImageUrl || null,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error(
      "Error fetching employee summary:",
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
