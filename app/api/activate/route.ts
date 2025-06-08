import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      console.error("Missing token or password");
      return NextResponse.json({ error: 'Missing token or password' }, { status: 400 });
    }

    const activation = await prisma.activationToken.findUnique({
      where: { token },
      include: { employee: true },
    });

    if (!activation) {
      console.error("Invalid or expired token");
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.employee.update({
      where: { id: activation.employeeId },
      data: {
        password: hashedPassword,
        isActive: true,
      },
    });

    await prisma.activationToken.delete({
      where: { token },
    });

    return NextResponse.json({ message: 'Account activated' });
  } catch (error) {
    console.error("Activation failed:", error);
    return NextResponse.json({ error: 'Something went wrong during activation.' }, { status: 500 });
  }
}
