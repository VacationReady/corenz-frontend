import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, email } = body;

    // 1. Check if employee already exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { email },
    });

    if (existingEmployee) {
      return NextResponse.json({ error: 'Employee with this email already exists' }, { status: 400 });
    }

    // 2. Create employee
    const newEmployee = await prisma.employee.create({
      data: {
        firstName,
        lastName,
        email,
        isActive: false,
      },
    });

    // 3. Generate activation token
    const token = crypto.randomUUID();

    await prisma.activationToken.create({
      data: {
        token,
        employeeId: newEmployee.id,
      },
    });

    // 4. Construct activation link using production domain
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://corenz-frontend.vercel.app';
    const activationLink = `${baseUrl}/activate?token=${token}`;

    // 5. Send activation email via Resend
    await resend.emails.send({
      from: 'SimplyHR <noreply@simplyhr.app>',
      to: email,
      subject: 'Activate Your SimplyHR Account',
      html: `
        <p>Hi ${firstName},</p>
        <p>Welcome to SimplyHR! Click the button below to activate your account:</p>
        <p><a href="${activationLink}" style="display:inline-block;padding:10px 20px;background-color:#4CAF50;color:white;text-decoration:none;border-radius:5px;">Activate Account</a></p>
        <p>If you didn’t request this, you can safely ignore it.</p>
      `,
    });

    return NextResponse.json({ message: 'Employee created and activation email sent' });
  } catch (error: any) {
    console.error('❌ Failed to create employee or send activation email:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
