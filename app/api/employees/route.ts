// /app/api/employees/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, department, jobRole } = body;

    const existingEmployee = await prisma.employee.findUnique({
      where: { email },
    });

    if (existingEmployee) {
      return NextResponse.json({ error: 'Employee with this email already exists' }, { status: 400 });
    }

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
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://corenz-frontend.vercel.app';
    const activationLink = `${baseUrl}/activate?token=${token}`;

    await resend.emails.send({
      from: 'SimplyHR <noreply@simplyhr.app>',
      to: email,
      subject: 'Activate Your SimplyHR Account',
      html: `
        <p>Hi ${firstName},</p>
        <p>Welcome to SimplyHR! Click below to activate your account:</p>
        <p><a href="${activationLink}" style="padding:10px 20px;background:#4CAF50;color:white;text-decoration:none;border-radius:5px;">Activate Account</a></p>
        <p>If you didn’t request this, you can ignore this email.</p>
      `,
    });

    return NextResponse.json({ message: 'Employee created and activation email sent' });
  } catch (error) {
    console.error('❌ Error in POST /api/employees:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const employees = await prisma.employee.findMany();
    return NextResponse.json(employees);
  } catch (error) {
    console.error('❌ Error in GET /api/employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}
