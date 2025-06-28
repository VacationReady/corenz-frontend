import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ✅ GET employee profile by Employee.id (not User.id)
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const employee = await prisma.employee.findUnique({
      where: {
        id: params.id, // ✅ Use Employee.id for matching
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            department: { select: { id: true, name: true } },
            jobRole: { select: { id: true, name: true } },
          },
        },
        leaveEntitlement: true,
        leaveRequests: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error(
      "Error fetching employee:",
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}

// ✅ DELETE employee by Employee.id
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: params.id }, // ✅ Using Employee.id for deletion
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    // Delete related activation token safely
    await prisma.activationToken.deleteMany({
      where: { userId: employee.userId },
    });

    // Delete the employee record
    await prisma.employee.delete({
      where: { id: params.id },
    });

    // Delete the user record
    await prisma.user.delete({
      where: { id: employee.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "Error deleting employee:",
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
