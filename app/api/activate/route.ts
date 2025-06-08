import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function GET() {
  console.log("✅ /api/activate GET route hit");
  return NextResponse.json({ message: "Activate route is live." });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Received body:", body);

    const { token, password } = body;

    if (!token || !password) {
      console.error("Missing token or password");
      return NextResponse.json({ error: 'Missing token or password' }, { status: 400 });
    }

    const activation = await prisma.activationToken.findUnique({
      where: { token },
      include: { employee: true },
    });

    if (!activation) {
      console.error("Invalid or expired token:", token);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    console.log("Token valid. Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("Updating employee record...");
    await prisma.employee.update({
      where: { id: activation.employeeId },
      data: {
        password: hashedPassword,
        isActive: true,
      },
    });

    console.log("Deleting token...");
    await prisma.activationToken.delete({
      where: { token },
    });

    console.log("Activation complete.");
    return NextResponse.json({ message: 'Account activated' });
  } catch (error: any) {
    console.error("⚠️ Activation failed RAW:", error);

    let fallback = "Unknown error";

    try {
      fallback = JSON.stringify(error, Object.getOwnPropertyNames(error));
      console.error("⚠️ Activation failed (stringified):", fallback);
    } catch (err2) {
      fallback = error?.toString() || "Non-serializable error";
      console.error("⚠️ Activation failed (toString fallback):", fallback);
    }

    return NextResponse.json({ error: fallback }, { status: 500 });
  }
}
