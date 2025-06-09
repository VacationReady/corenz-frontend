import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  const employees = await prisma.employee.findMany();
  return NextResponse.json(employees);
}

export async function POST(req: Request) {
  try {
    const { firstName, lastName, email } = await req.json();

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Create Employee
    const newEmployee = await prisma.employee.create({
      data: {
        firstName,
        lastName,
        email,
        isActive: false,
      },
    });

    // 2. Create Activation Token
    const token = uuidv4();
    await prisma.activationToken.create({
      data: {
        token,
        employeeId: newEmployee.id,
      },
    });

    // 3. Construct Activation Link
    const activationLink = `https://corenz-frontend.vercel.app/activate?token=${token}`;

    // 4. Send Email with Resend
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Activate your account",
      html: `<p>Hello ${firstName},</p><p>Please activate your account by clicking the link below:</p><p><a href="${activationLink}">Activate Account</a></p>`,
    });

    return NextResponse.json({ message: "Employee created and email sent." });
  } catch (error) {
    console.error("POST /api/employees error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
