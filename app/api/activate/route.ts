import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
    }

    const activationToken = await prisma.activationToken.findUnique({
      where: { token },
      include: { employee: true },
    });

    if (!activationToken || activationToken.expiresAt && activationToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "Token is invalid or has expired" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.employee.update({
      where: { id: activationToken.employeeId },
      data: {
        password: hashedPassword,
        isActivated: true,
        isActive: true,
      },
    });

    await prisma.activationToken.delete({ where: { token } });

    return NextResponse.json({ message: "Password set successfully." });
  } catch (error) {
    console.error("Activation error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "Activate route is live." });
}
