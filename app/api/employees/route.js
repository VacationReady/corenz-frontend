import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { hash } from 'bcryptjs';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma'; // adjust if you store your client elsewhere

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, phone, department, jobRole } = body;

  if (!name || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    // 1. Insert employee into DB
    const newEmployee = await prisma.employee.create({
      data: { name, email, phone, department, jobRole },
    });

    // 2. Generate activation token
    const token = uuidv4();
    const hashedToken = await hash(token, 10);
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

    // 3. Store token in DB
    await prisma.activationToken.create({
      data: {
        token: hashedToken,
        employeeId: newEmployee.id,
        expiresAt: expires,
      },
    });

    // 4. Send activation email
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // or another SMTP provider
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const activationLink = `${process.env.NEXTAUTH_URL}/activate?token=${token}`;

    await transporter.sendMail({
      from: `"SimplyHR" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Activate your account',
      html: `
        <p>Hello ${name},</p>
        <p>Welcome! Click the link below to activate your account:</p>
        <a href="${activationLink}">${activationLink}</a>
        <p>This link will expire in 24 hours.</p>
      `,
    });

    return NextResponse.json({ message: 'Employee created and activation email sent.' }, { status: 200 });

  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
