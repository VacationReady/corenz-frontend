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

    console.log('🔐 Received token and password');

    const activationToken = await prisma.activationToken.findUnique({
      where: { token },
      include: { employee: true },
    });

    if (!activationToken) {
      console.error('❌ Invalid or expired token');
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const isExpired = new Date(activationToken.expiresAt) < new Date();
    if (isExpired) {
      console.warn('⚠️ Token has expired');
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updatedEmployee = await prisma.employee.update({
      where: { id: activationToken.employee.id },
      data: {
        password: hashedPassword,
        isActivated: true,
        updatedAt: new Date(),
      },
    });

    await prisma.activationToken.delete({
      where: { token },
    });

    console.log('✅ Account activated for', updatedEmployee.email);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Activation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
