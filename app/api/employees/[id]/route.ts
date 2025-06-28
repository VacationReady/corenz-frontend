import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ✅ GET /api/employees/[id] - Fetch employee data
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            department: { select: { name: true } },
            jobRole: { select: { name: true } },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: employee.id,
      firstName: employee.user.firstName,
      lastName: employee.user.lastName,
      email: employee.user.email,
      phone: employee.user.phone,
      department: employee.user.department?.name || "-",
      jobRole: employee.user.jobRole?.name || "-",
    });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ✅ DELETE /api/employees/[id]
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;

    // Find the user with related employee and activation token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: true,
        activationToken: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    // Delete ActivationToken if it exists
    if (user.activationToken) {
      await prisma.activationToken.delete({
        where: { userId: user.id },
      });
    }

    // Delete Employee if it exists
    if (user.employee) {
      await prisma.employee.delete({
        where: { id: user.employee.id },
      });
    }

    // Finally, delete the User
    await prisma.user.delete({
      where: { id: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error while deleting employee." },
      { status: 500 }
    );
  }
}
