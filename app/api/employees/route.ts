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
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "active"; // active, archived, all
    
    const whereCondition: any = {};
    
    if (status === "active") {
      whereCondition.isActive = true;
    } else if (status === "archived") {
      whereCondition.isActive = false;
    }
    // If status is "all", no filter is applied

    const employees = await prisma.employee.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            jobRole: {
              select: { id: true, name: true },
            },
          },
        },
        department: {
          select: { id: true, name: true },
        },
        offboardingRecord: {
          select: {
            id: true,
            status: true,
            lastWorkingDate: true,
            offboardingType: true,
            completedAt: true,
          },
        },
      },
      orderBy: { id: "desc" },
    });

    const flattened = employees.map((emp) => ({
      id: emp.id,
      userId: emp.user.id,
      firstName: emp.user.firstName,
      lastName: emp.user.lastName,
      email: emp.user.email,
      phone: emp.user.phone,
      role: emp.user.role,
      departmentId: emp.department?.id ?? null,
      departmentName: emp.department?.name ?? null,
      jobRoleId: emp.user.jobRole?.id ?? null,
      jobRoleName: emp.user.jobRole?.name ?? null,
      isActive: emp.isActive,
      offboardingStatus: emp.offboardingStatus,
      lastWorkingDate: emp.lastWorkingDate,
      offboardingRecord: emp.offboardingRecord,
    }));

    return NextResponse.json(flattened);
  } catch (error) {
    console.error("Failed to load employees:", error);
    return new NextResponse("Error loading employees", { status: 500 });
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

    const companyId = session.user.companyId;

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
      startOnboarding,
      sendInviteNow,
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
        company: { connect: { id: companyId } },
        department: departmentId ? { connect: { id: departmentId } } : undefined,
        jobRole: jobRoleId ? { connect: { id: jobRoleId } } : undefined,
        manager: managerConnect,
      },
    });

    // ✅ Create Employee linked to User
    const employee = await prisma.employee.create({
  data: {
    user: { connect: { id: user.id } },
    isActive: true,
    department: departmentId ? { connect: { id: departmentId } } : undefined,
    company: { connect: { id: companyId! } }, // ✅ FIXED: use relation connect
  },
});

    // Create activation token now; email optionally sent now or later
    await prisma.activationToken.create({
      data: {
        token: activationToken,
        user: { connect: { id: user.id } },
      },
    });

    const activationLink = `${process.env.NEXT_PUBLIC_APP_URL}/activate?token=${activationToken}&employeeId=${employee.id}`;

    if (sendInviteNow) {
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
    }

    // ✅ Optional onboarding trigger
    if (startOnboarding) {
      try {
        // Hit our start endpoint to create instance + assignment and send onboarding email
        const startRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/onboarding/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId: employee.id }),
        });
        if (!startRes.ok) {
          console.warn("Onboarding start failed:", await startRes.text());
        }
      } catch (e) {
        console.warn("Onboarding start error:", e);
      }
    }

    return NextResponse.json({ success: true, employeeId: employee.id, userId: user.id, activationLink: sendInviteNow ? undefined : activationLink });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error while creating employee." },
      { status: 500 }
    );
  }
}
