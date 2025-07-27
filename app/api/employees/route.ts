import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

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
          },
        },
        department: {
          select: { id: true, name: true },
        },
        jobRole: {
          select: { id: true, name: true },
        },
      },
      orderBy: { id: 'desc' },
    });

    const flattened = employees.map(emp => ({
      id: emp.id,
      userId: emp.user.id,
      firstName: emp.user.firstName,
      lastName: emp.user.lastName,
      email: emp.user.email,
      phone: emp.user.phone,
      role: emp.user.role,
      departmentId: emp.department?.id ?? null,
      departmentName: emp.department?.name ?? null,
      jobRoleId: emp.jobRole?.id ?? null,
      jobRoleName: emp.jobRole?.name ?? null,
    }));

    return NextResponse.json(flattened);
  } catch (error) {
    console.error('Failed to load employees:', error);
    return new NextResponse('Error loading employees', { status: 500 });
  }
}

    return NextResponse.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json(
      { success: false, error: "Failed to fetch employees." },
      { status: 500 }
    );
  }
}

// ✅ POST: Add new employee with companyId scoping and activation email
export async function POST(req: Request) {
  try {
    console.log("⚡ Request cookies:", req.headers.get("cookie"));
    const session = await getServerSession(authOptions);
    console.log("⚡ Session returned:", session);
    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized or missing company context." },
        { status: 401 }
      );
    }
    const companyId = session.user.companyId; // ✅ pulled securely from session

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

    // ✅ Handle manager linking safely
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

    // ✅ Create User with company linkage
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role,
        company: { connect: { id: companyId } }, // ✅ securely associate user with company
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
