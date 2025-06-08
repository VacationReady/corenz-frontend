import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const body = await req.json();
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

    // 4. Send activation email with Resend
    const activationLink = `${process.env.NEXTAUTH_URL}/activate?token=${token}`;

    await resend.emails.send({
      from: 'SimplyHR <onboarding@resend.dev>', // update if you verify your domain
      to: email,
      subject: 'Activate your account',
      html: `
        <p>Hello ${name},</p>
        <p>Welcome to SimplyHR
