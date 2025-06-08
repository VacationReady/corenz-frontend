import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log('Incoming employee request:', body); // 🐛 DEBUG LOG

  const { name, email, phone, department, jobRole } = body;

  if (!name || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    // 1. Create the employee
    const newEmployee = await prisma.employee.create({
      data: { name, email, phone, department, jobRole },
    });

    // 2. Generate the activation token
    const token = uuidv4();
    const hashedToken = await hash(token, 10);
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

    // 3. Store the token in the database
    await prisma.activationToken.create({
      data: {
        token: hashedToken,
        employeeId: newEmployee.id,
        expiresAt: expires,
      },
    });

    // 4. Send activation email via Resend
    const activationLink = `${process.env.NEXTAUTH_URL}/activate?token=${token}`;

    await resend.emails.send({
      from: 'SimplyHR <onboarding@resend.dev>',
      to: email,
      subject: 'Activate your account',
      html: `
        <p>Hello ${name},</p>
        <p>Welcome to SimplyHR! Click the link below to activate your account:</p>
        <p><a href="${activationLink}">${activationLink}</a></p>
        <p>This link will expire in 24 hours.</p>
      `,
    });

    return NextResponse.json({ message: 'Employee created and activation email sent.' }, { status: 200 });

  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
