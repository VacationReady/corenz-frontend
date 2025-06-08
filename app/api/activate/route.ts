import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      console.error('❌ Missing token or password');
      return NextResponse.json({ error: 'Missing token or password' }, { status: 400 });
    }

    const activationToken = await prisma.activationToken.findUnique({
      where: { token },
      include: { employee: true },
    });

    if (!activationToken) {
      console.error('❌ Token not found');
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    if (!activationToken.employee) {
      console.error('❌ Token found but employee not linked');
      return NextResponse.json({ error: 'Employee not found' }, { status: 400 });
    }

    const isExpired = new Date(activationToken.expiresAt) < new Date();
    if (isExpired) {
      console.warn('⚠️ Token expired');
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.employee.update({
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

    console.log(`✅ Successfully activated account for ${activationToken.employee.email}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Unexpected activation error:', error.message || error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
