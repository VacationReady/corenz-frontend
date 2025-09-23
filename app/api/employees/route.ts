import { NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canAccessEmployee } from "@/lib/permissions";
import { z } from "zod";
import supabase from "@/lib/supabase-admin";
import { resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "@/lib/email/template";

const optionalTrimmedString = z.preprocess(
  (val) => {
    if (val === null || val === undefined) {
      return undefined;
    }
    if (typeof val === "string") {
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    }
    return val;
  },
  z.string().optional(),
);

const createEmployeeSchema = z.object({
  firstName: z
    .string({ required_error: "First name is required" })
    .trim()
    .min(1, "First name is required"),
  lastName: z
    .string({ required_error: "Last name is required" })
    .trim()
    .min(1, "Last name is required"),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Invalid email address"),
  phone: optionalTrimmedString,
  dateOfBirth: optionalTrimmedString,
  startDate: z
    .string({ required_error: "Start date is required" })
    .trim()
    .min(1, "Start date is required"),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"], {
    required_error: "Role is required",
  }),
  jobRoleId: optionalTrimmedString,
  departmentId: optionalTrimmedString,
  managerId: optionalTrimmedString,
  sendInviteNow: z.boolean().optional(),
  onboardingTemplateId: z
    .string({ required_error: "Need to select onboarding template" })
    .trim()
    .min(1, "Need to select onboarding template"),
  holidayYear: optionalTrimmedString,
  workingPatternId: optionalTrimmedString,
  entitlementDays: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === "") {
        return undefined;
      }
      if (typeof val === "string") {
        const parsed = Number(val);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      if (typeof val === "number") {
        return Number.isFinite(val) ? val : undefined;
      }
      return undefined;
    },
    z.number().nonnegative().optional(),
  ),
});

// ✅ GET: Return employees with their user data for listing
export async function GET(req: Request) {
  try {
    await ensurePrismaConnected();
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
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
            profileImageUrl: true,
          },
        },
        Department: {
          select: { id: true, name: true },
        },
        JobRole: {
          select: { id: true, name: true },
        },
        EmployeeOffboarding: {
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

    const flattened = await Promise.all(
      employees.map(async (emp) => {
        let profileUrl: string | null = null;
        if (emp.User.profileImageUrl) {
          try {
            const { data } = await supabase.storage
              .from("documents")
              .createSignedUrl(emp.User.profileImageUrl, 60 * 5);
            profileUrl = data?.signedUrl ?? null;
          } catch {
            profileUrl = null;
          }
        }

        return {
          id: emp.id,
          userId: emp.User.id,
          firstName: emp.User.firstName,
          lastName: emp.User.lastName,
          email: emp.User.email,
          phone: emp.User.phone,
          role: emp.User.role,
          createdAt: emp.User.createdAt,
          departmentId: emp.Department?.id ?? null,
          departmentName: emp.Department?.name ?? null,
          jobRoleId: emp.JobRole?.id ?? null,
          jobRoleName: emp.JobRole?.name ?? null,
          isActive: emp.isActive,
          offboardingStatus: emp.offboardingStatus,
          lastWorkingDate: emp.lastWorkingDate,
          offboardingRecord: emp.EmployeeOffboarding,
          profileImageUrl: profileUrl,
        } as const;
      }),
    );

    return NextResponse.json(flattened);
  } catch (error) {
    console.error("Failed to load employees:", error);
    return NextResponse.json(
      { error: "Error loading employees" },
      { status: 500 },
    );
  }
}

// ✅ POST: Add new employee with companyId scoping and activation email
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized or missing company context." },
        { status: 401 },
      );
    }

    const companyId = session.user.companyId;
    const appBaseUrl = getAppBaseUrl();

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
      sendInviteNow = false,
      onboardingTemplateId,
      holidayYear,
      workingPatternId,
      entitlementDays,
    } = createEmployeeSchema.parse(await req.json());

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

    // ✅ Handle manager linking safely (capture manager's User.id)
    let managerUserId: string | null = null;
    if (managerId && managerId.trim() !== "") {
      const managerEmployee = await prisma.employee.findUnique({
        where: { id: managerId },
        select: { userId: true, companyId: true },
      });

      if (managerEmployee?.userId && managerEmployee.companyId === companyId) {
        managerUserId = managerEmployee.userId;
      } else {
        console.warn(
          `Manager Employee ID ${managerId} missing or cross-company. Skipping manager link.`,
        );
      }
    }

    // ✅ Create User with company linkage
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        role,
        Company: { connect: { id: companyId } },
        updatedAt: new Date(),
      },
    });

    // ✅ Create Employee linked to User
    const normalizedTemplateId =
      onboardingTemplateId === "none" ? undefined : onboardingTemplateId;

    const employee = await prisma.employee.create({
      data: {
        id: crypto.randomUUID(),
        User: { connect: { id: user.id } },
        isActive: true,
        Department: departmentId
          ? { connect: { id: departmentId } }
          : undefined,
        JobRole: jobRoleId
          ? { connect: { id: jobRoleId } }
          : undefined,
        Company: { connect: { id: companyId! } }, // ✅ use relation connect
        OnboardingTemplate: normalizedTemplateId
          ? { connect: { id: normalizedTemplateId } }
          : undefined,
      },
    });

    // ✅ Auto-promote manager and apply Manager permission profile within company
    //    - Only elevate EMPLOYEE to MANAGER
    //    - Never downgrade an ADMIN to MANAGER
    if (managerId && managerId.trim() !== "") {
      try {
        const mgr = await prisma.employee.findUnique({
          where: { id: managerId },
          select: { userId: true, companyId: true },
        });
        if (mgr?.userId && mgr.companyId === companyId) {
          // Ensure the new employee points to this manager as their line manager
          await prisma.user.update({
            where: { id: user.id },
            data: { managerId: mgr.userId },
          });

          const mgrUser = await prisma.user.findUnique({
            where: { id: mgr.userId },
            select: { role: true },
          });
          if (mgrUser?.role === "EMPLOYEE") {
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
        }
      } catch (e) {
        console.warn("Failed to auto-promote manager role:", e);
      }
    }

    // Create activation token now; email optionally sent now or later
    await prisma.activationToken.create({
      data: {
        id: crypto.randomUUID(),
        token: activationToken,
        User: { connect: { id: user.id } },
      },
    });

    const redirectPath = normalizedTemplateId
      ? `/${employee.id}/onboarding`
      : `/dashboard`;
    const activationLink = `${appBaseUrl}/activate?token=${activationToken}&redirect=${encodeURIComponent(redirectPath)}`;

    if (sendInviteNow) {
      const { html, text } = renderPeopleCoreEmail({
        preheader: "Activate your PeopleCore account",
        title: "Activate Your PeopleCore Account",
        intro: [
          `Hi ${firstName},`,
          "Welcome to PeopleCore! Use the link below to activate your account and get started.",
        ],
        ctas: {
          label: "Activate Account",
          href: activationLink,
        },
        outro: [
          "If you weren't expecting this email, you can ignore it.",
          "Thank you,",
          "The PeopleCore Team",
        ],
      });

      await resend.emails.send({
        from: "noreply@peoplecore.co.nz",
        to: email,
        subject: "Activate Your PeopleCore Account",
        html,
        text,
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
            id: crypto.randomUUID(),
            employeeId: employee.id,
            workingPatternId,
            effectiveDate: new Date(), // Use current date, not start date
            updatedAt: new Date(),
          },
        });
      } catch (e) {
        console.warn("Working pattern assignment failed:", e);
      }
    }

    // Create leave entitlement if provided
    if (entitlementDays && holidayYear) {
      try {
        // Only use the canonical "Annual Leave" category; do not fallback to legacy labels
        let annualCategory = await prisma.eventCategory.findFirst({
          where: {
            name: "Annual Leave",
            categoryType: "TIME_OFF",
            isActive: true,
            companyId,
          },
        });

        if (!annualCategory) {
          annualCategory = await prisma.eventCategory.create({
            data: {
              id: crypto.randomUUID(),
              name: "Annual Leave",
              categoryType: "TIME_OFF",
              requiresApproval: true,
              adminOnly: false,
              color: "#008000",
              isActive: true,
              companyId,
              systemDefined: true,
              updatedAt: new Date(),
            },
          });
        }

        await prisma.leaveEntitlement.create({
          data: {
            id: crypto.randomUUID(),
            employeeId: employee.id,
            eventCategoryId: annualCategory.id,
            totalDays: entitlementDays,
            usedDays: 0,
            companyId,
            updatedAt: new Date(),
          },
        });
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error while creating employee.",
      },
      { status: 500 },
    );
  }
}

