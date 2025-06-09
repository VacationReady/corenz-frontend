import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendActivationEmail } from '@/lib/mailer';

export async function GET() {
  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(employees);
}

export async function POST(req: Request) {
  try {
    const { firstName, lastName, email, phone, department, jobRole } = await req.json();

    const newEmployee = await prisma.employee.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        department,
        jobRole,
        isActive: false,
      },
    });

    const token = crypto.randomUUID();
    await prisma.activationToken.create({
      data: {
        token,
        employeeId: newEmployee.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h
      },
    });

    const activationLink = `https://corenz-frontend.vercel.app/activate?token=${token}`;
    await sendActivationEmail(email, activationLink);

    return NextResponse.json(newEmployee);
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}
