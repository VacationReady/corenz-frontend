import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/employees/[id]
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
