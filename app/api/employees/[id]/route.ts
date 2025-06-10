// /app/api/employees/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (err) {
    console.error("Error fetching employee:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    // First delete related ActivationTokens
    await prisma.activationToken.deleteMany({
      where: { employeeId: params.id },
    });

    // Then delete the employee
    await prisma.employee.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Employee deleted" });
  } catch (error) {
    console.error("Delete failed:", error);
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
  }
}
