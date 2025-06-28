import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ✅ GET employee profile by User.id (not Employee.id)
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const employee = await prisma.employee.findUnique({
      where: {
        userId: params.id, // ✅ using User.id for routing
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

// ✅ DELETE employee by User.id
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Find the employee record
    const employee = await prisma.employee.findUnique({
      where: { userId: params.id },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    // Delete related activation token safely
    await prisma.activationToken.deleteMany({
      where: { userId: params.id },
    });

    // Delete the employee record
    await prisma.employee.delete({
      where: { userId: params.id },
    });

    // Delete the user record
    await prisma.user.delete({
      where: { id: params.id },
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
