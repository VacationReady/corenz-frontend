import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";

const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ GET: Return employees with their user data for listing
export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            department: { select: { name: true } },
            jobRole: { select: { name: true } },
          },
        },
      },
      orderBy: { id: "desc" },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json(
      { success: false, error: "Failed to fetch employees." },
      { status: 500 }
    );
  }
}

// ✅ POST: Add new employee with activation email and correct manager linking
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
    const hashedPassword = ""; // Leave blank for activation

    // ✅ Handle manager linking safely with Prisma type correctness
    let managerConnect: Prisma.UserCreateNestedOneWithoutSubordinatesInput | undefined = undefined;
    if (managerId && managerId.trim() !== "") {
      const managerEmployee = await prisma.employee.findUnique({
        where: { id: managerId },
        select: { userId: true },
      });

      if (managerEmployee?.userId) {
        managerConnect = { connect: { id: managerEmployee.userId } };
      } else {
        console.warn(`Manager Employee ID ${managerId} provided, but no Employee found. Skipping manager connect.`);
      }
    }

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
        manager: managerConnect,
      },
    });

    await prisma.employee.create({
      data: {
        user: { connect: { id: user.id } },
        isActive: true,
        department: departmentId ? { connect: { id: departmentId } } : undefined,
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
      from: "onboarding@resend.dev",
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
      { success: false, error: "Internal server error while creating employee." },
      { status: 500 }
    );
  }
}
