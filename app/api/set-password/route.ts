// /app/api/set-password/route.ts

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
    }

    // Find activation token and related employee
    const activationToken = await prisma.activationToken.findUnique({
      where: { token },
      include: { employee: true },
    });

    if (!activationToken || !activationToken.employee) {
      return NextResponse.json({ error: "Invalid or expired activation token" }, { status: 400 });
    }

    // Hash password and update employee
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.employee.update({
      where: { id: activationToken.employeeId },
      data: {
        password: hashedPassword,
      },
    });

    // Delete activation token
    await prisma.activationToken.delete({
      where: { token },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in set-password route:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
