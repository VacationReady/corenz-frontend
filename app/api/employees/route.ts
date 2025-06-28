import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      startDate,
      role,
      jobRoleId,
      departmentId,
      managerId,
    } = await req.json();

    if (!firstName || !lastName || !email || !startDate || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser && existingUser.isActivated) {
      return NextResponse.json(
        { success: false, error: "A user with this email already exists and is activated." },
        { status: 400 }
      );
    }

    if (existingUser && !existingUser.isActivated) {
      return NextResponse.json(
        { success: false, error: "A user with this email already exists but is not activated. Please activate this user or use a different email." },
        { status: 400 }
      );
    }

    const activationToken = randomBytes(32).toString("hex");

    const hashedPassword = ""; // Left blank for activation flow

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role,
        department: departmentId ? { connect: { id: departmentId } } : undefined,
        jobRole: jobRoleId ? { connect: { id: jobRoleId } } : undefined,
        manager: managerId ? { connect: { id: managerId } } : undefined,
      },
    });

    await prisma.employee.create({
      data: {
        user: { connect: { id: user.id } },
        isActive: true,
      },
    });

    await prisma.activationToken.create({
      data: {
        token: activationToken,
        user: { connect: { id: user.id } },
      },
    });

    const activationLink = `${process.env.NEXT_PUBLIC_APP_URL}/activate?token=${activationToken}`;

    await resend.emails.send({
      from: "onboarding@corenz.io",
      to: email,
      subject: "Activate Your CoreNZ Account",
      html: `
        <p>Hi ${firstName},</p>
        <p>Welcome to CoreNZ! Please click the link below to activate your account and set your password:</p>
        <p><a href="${activationLink}">Activate Your Account</a></p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
