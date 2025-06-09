import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Activate route is live." });
}

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Missing token or password." }, { status: 400 });
    }

    const activationToken = await prisma.activationToken.findUnique({
      where: { token },
      include: { employee: true },
    });

    if (!activationToken || !activationToken.employee) {
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.employee.update({
      where: { id: activationToken.employeeId },
      data: {
        password: hashedPassword,
        isActive: true,
        isActivated: true, // ✅ important for login
      },
    });

    await prisma.activationToken.delete({
      where: { token },
    });

    return NextResponse.json({ message: "Account activated" }); // ✅ always return JSON
  } catch (error) {
    console.error("Activation error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
