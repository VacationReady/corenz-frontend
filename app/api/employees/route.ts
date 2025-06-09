import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { firstName, lastName, email, phone, department, jobRole } = await req.json();

    const token = uuidv4();

    const newEmployee = await prisma.employee.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        department,
        jobRole,
        isActive: false,
        activationToken: {
          create: {
            token,
          },
        },
      },
    });

    const activationLink = `https://corenz-frontend.vercel.app/activate?token=${token}`;

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Activate Your CoreNZ Account',
      html: `<p>Hello ${firstName},</p><p>Click <a href="${activationLink}">here</a> to activate your account.</p>`,
    });

    return NextResponse.json({ message: 'Employee created and email sent.' }, { status: 201 });
  } catch (error) {
    console.error('Error in employee creation:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const employees = await prisma.employee.findMany();
    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to load employees' }, { status: 500 });
  }
}
