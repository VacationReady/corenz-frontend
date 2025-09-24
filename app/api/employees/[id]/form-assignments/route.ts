import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  context: { params: { id: string } },
) {
  const { id } = context.params;
  const employeeId = id;

  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify employee belongs to the same company
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId: session.user.companyId,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // Get Form assignments for this employee
    const assignments = await prisma.formAssignment.findMany({
      where: { employeeId },
      include: {
        Form: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        User: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // Determine status based on completion and due date
    const now = new Date();
    const assignmentsWithStatus = assignments.map((assignment) => {
      let status = assignment.status;

      if (assignment.completedAt) {
        status = "completed";
      } else if (assignment.dueDate && new Date(assignment.dueDate) < now) {
        status = "overdue";
      } else {
        status = "pending";
      }

      return {
        ...assignment,
        status,
      };
    });

    return NextResponse.json(assignmentsWithStatus);
  } catch (error) {
    console.error("Error fetching Form assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
