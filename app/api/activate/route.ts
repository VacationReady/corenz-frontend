import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Missing token or password' }, { status: 400 });
    }

    const activationToken = await prisma.activationToken.findUnique({
      where: { token },
      include: { employee: true },
    });

    if (!activationToken) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const isExpired = new Date(activationToken.expiresAt) < new Date();
    if (isExpired) {
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.employee.update({
      where: { id: activationToken.employeeId },
      data: {
        password: hashedPassword,
        isActivated: true,
      },
    });

    // Optional cleanup
    await prisma.activationToken.delete({
      where: { token },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Activation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
