import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canAccessEmployee } from "@/lib/permissions";

const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ GET: Return employees with their user data for listing
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "active"; // active, archived, all
    const userId = searchParams.get("userId");
    const managerId = searchParams.get("managerId");

    // Base scoping
    const whereCondition: any = { companyId: session.user.companyId };

    if (userId) whereCondition.userId = userId;
    if (managerId) whereCondition.user = { managerId };
    if (status === "active") whereCondition.isActive = true;
    else if (status === "archived") whereCondition.isActive = false;
    // If status is "all", no isActive filter is applied

    // Access control: ADMIN can list all; MANAGER limited to themselves + direct reports
    if (session.user.role === "MANAGER") {
      // Fetch subordinates of the current manager (by User relation)
      const subordinates = await prisma.user.findMany({
        where: { managerId: session.user.id, companyId: session.user.companyId },
        select: { id: true },
      });
      const subordinateUserIds = subordinates.map((u) => u.id);

      // Allowed employee userIds are: self and subordinates
      const allowedUserIds = [session.user.id, ...subordinateUserIds];

      // Combine with any existing whereCondition
      whereCondition.user = {
        ...(whereCondition.user || {}),
        id: { in: allowedUserIds },
      };
    }

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
            createdAt: true,
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
      createdAt: emp.user.createdAt,
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
        { status: 401 },
      );
    }

    const companyId = session.user.companyId;

    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      startDate,
      role,
      jobRoleId,
      departmentId,
      managerId,
      sendInviteNow,
      onboardingTemplateId,
      holidayYear,
      workingPatternId,
      entitlementDays,
    } = await req.json();

    if (!firstName || !lastName || !email || !startDate || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 },
      );
    }

    if (!onboardingTemplateId) {
      return NextResponse.json(
        { success: false, error: "Need to select onboarding template" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email_companyId: { email, companyId } },
    });
    if (existingUser && existingUser.isActivated) {
      return NextResponse.json(
        {
          success: false,
          error: "A user with this email already exists and is activated.",
        },
        { status: 400 },
      );
    }

    if (existingUser && !existingUser.isActivated) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A user with this email already exists but is not activated. Please activate this user or use a different email.",
        },
        { status: 400 },
      );
    }

    const activationToken = randomBytes(32).toString("hex");
    const hashedPassword = ""; // Leave blank for activation

    // ✅ Handle manager linking safely
    let managerConnect:
      | Prisma.UserCreateNestedOneWithoutSubordinatesInput
      | undefined = undefined;
    if (managerId && managerId.trim() !== "") {
      const managerEmployee = await prisma.employee.findUnique({
        where: { id: managerId },
        select: { userId: true },
      });

      if (managerEmployee?.userId) {
        managerConnect = { connect: { id: managerEmployee.userId } };
      } else {
        console.warn(
          `Manager Employee ID ${managerId} provided, but no Employee found. Skipping manager connect.`,
        );
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
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        role,
        company: { connect: { id: companyId } },
        department: departmentId
          ? { connect: { id: departmentId } }
          : undefined,
        jobRole: jobRoleId ? { connect: { id: jobRoleId } } : undefined,
        manager: managerConnect,
      },
    });

    // ✅ Create Employee linked to User
    const normalizedTemplateId =
      onboardingTemplateId === "none" ? undefined : onboardingTemplateId;

    const employee = await prisma.employee.create({
      data: {
        user: { connect: { id: user.id } },
        isActive: true,
        department: departmentId
          ? { connect: { id: departmentId } }
          : undefined,
        company: { connect: { id: companyId! } }, // ✅ use relation connect
        onboardingTemplate: normalizedTemplateId
          ? { connect: { id: normalizedTemplateId } }
          : undefined,
      },
    });

    // After creating employee, auto-promote manager to MANAGER role and apply Manager permission profile if provided
    if (managerId && managerId.trim() !== "") {
      try {
        const mgr = await prisma.employee.findUnique({
          where: { id: managerId },
          select: { userId: true },
        });
        if (mgr?.userId) {
          // Try to find a Manager permission profile for this company
          const managerProfile = await prisma.permissionProfile.findFirst({
            where: {
              companyId,
              name: { equals: "Manager", mode: "insensitive" },
            },
            select: { id: true },
          });

          await prisma.user.update({
            where: { id: mgr.userId },
            data: {
              role: "MANAGER",
              ...(managerProfile ? { permissionProfileId: managerProfile.id } : {}),
            },
          });
        }
      } catch (e) {
        console.warn("Failed to auto-promote manager role:", e);
      }
    }

    // Create activation token now; email optionally sent now or later
    await prisma.activationToken.create({
      data: {
        token: activationToken,
        user: { connect: { id: user.id } },
      },
    });

    const redirectPath = normalizedTemplateId
      ? `/${employee.id}/onboarding`
      : `/dashboard`;
    const activationLink = `${process.env.NEXT_PUBLIC_APP_URL}/activate?token=${activationToken}&redirect=${encodeURIComponent(redirectPath)}`;

    if (sendInviteNow) {
      await resend.emails.send({
        from: "noreply@peoplecore.co.nz",
        to: email,
        subject: "Activate Your PeopleCore Account",
        html: `
          <p>Hi ${firstName},</p>
          <p>Welcome to PeopleCore! Please click the link below to activate your account and get started:</p>
          <p><a href="${activationLink}">Activate Your Account</a></p>
        `,
      });
    }

    // ✅ Optional onboarding trigger
    if (normalizedTemplateId) {
      try {
        const startRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/onboarding/start`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              cookie: req.headers.get("cookie") ?? "",
            },
            body: JSON.stringify({
              employeeId: employee.id,
              templateId: normalizedTemplateId,
              sendEmail: false,
            }),
          },
        );

        if (!startRes.ok) {
          console.warn("Onboarding start failed:", await startRes.text());
        }
      } catch (e) {
        console.warn("Onboarding start error:", e);
      }
    }

    // Assign working pattern if provided
    if (workingPatternId) {
      try {
        await prisma.employeeWorkingPatternAssignment.create({
          data: {
            employeeId: employee.id,
            workingPatternId,
            effectiveDate: new Date(), // Use current date, not start date
          },
        });
      } catch (e) {
        console.warn("Working pattern assignment failed:", e);
      }
    }

    // Create leave entitlement if provided
    if (entitlementDays && holidayYear) {
      try {
        // Find or create the standard holiday event category
        let holidayCategory = await prisma.eventCategory.findFirst({
          where: {
            name: "Holiday",
            categoryType: "TIME_OFF",
            isActive: true,
            companyId,
          },
        });

        // If Holiday category doesn't exist, create it
        if (!holidayCategory) {
          holidayCategory = await prisma.eventCategory.create({
            data: {
              name: "Holiday",
              categoryType: "TIME_OFF",
              requiresApproval: true,
              adminOnly: false,
              color: "#10B981", // Green color
              isActive: true,
              companyId,
            },
          });
        }

        if (holidayCategory) {
          await prisma.leaveEntitlement.create({
            data: {
              employeeId: employee.id,
              eventCategoryId: holidayCategory.id,
              totalDays: entitlementDays,
              usedDays: 0,
              companyId,
            },
          });
        }
      } catch (e) {
        console.warn("Leave entitlement creation failed:", e);
      }
    }

    return NextResponse.json({
      success: true,
      employeeId: employee.id,
      userId: user.id,
      activationLink: sendInviteNow ? undefined : activationLink,
    });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error while creating employee.",
      },
      { status: 500 },
    );
  }
}
