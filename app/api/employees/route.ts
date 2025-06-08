import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    const employees = await prisma.employee.findMany();
    return NextResponse.json(employees);
  } catch (error) {
    console.error('❌ Failed to fetch employees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, email, phone, department, jobRole } = await req.json();

    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        phone,
        department,
        jobRole,
        isActivated: false,
      },
    });

    const token = uuidv4();

    await prisma.activationToken.create({
      data: {
        token,
        employeeId: employee.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h expiry
      },
    });

    const activationLink = `${process.env.NEXTAUTH_URL}/activate?token=${token}`;

    await resend.emails.send({
      from: 'noreply@corenz.co.nz', // update to match your verified domain
      to: email,
      subject: 'Activate your CoreNZ account',
      html: `
        <div style="font-family: sans-serif; line-height: 1.5;">
          <h2>Welcome to CoreNZ, ${name}!</h2>
          <p>Click the button below to activate your account and set your password:</p>
          <p>
            <a href="${activationLink}" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:white;text-decoration:none;border-radius:5px;">
              Activate My Account
            </a>
          </p>
          <p>This link will expire in 24 hours.</p>
        </div>
      `,
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error('❌ Error creating employee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
