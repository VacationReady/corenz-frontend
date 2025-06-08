// /app/api/activate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ error: 'Token and password are required.' }, { status: 400 });
  }

  try {
    const allTokens = await prisma.activationToken.findMany({
      include: { employee: true },
    });

    // Find the matching token manually
    const match = await Promise.any(
      allTokens.map(async (entry) => {
        const isValid = await compare(token, entry.token);
        if (isValid && entry.expiresAt > new Date()) return entry;
        throw new Error();
      })
    ).catch(() => null);

    if (!match) {
      return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
    }

    const hashedPassword = await hash(password, 10);

    // Update employee
    await prisma.employee.update({
      where: { id: match.employeeId },
      data: {
        password: hashedPassword,
        isActivated: true,
      },
    });

    // Delete the token
    await prisma.activationToken.delete({
      where: { id: match.id },
    });

    return NextResponse.json({ message: 'Password set successfully.' });
  } catch (err) {
    console.error('Activation error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
