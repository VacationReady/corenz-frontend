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
import { batchSignProfileUrlsAsMap } from "@/lib/storage/signProfiles";

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
  locationId: optionalTrimmedString,
  siteLocation: optionalTrimmedString,
  contractType: optionalTrimmedString,
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
  // NZ Leave Compliance Fields
  sickLeaveDays: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === "") {
        return 10; // NZ default: 10 days after 6 months
      }
      if (typeof val === "string") {
        const parsed = Number(val);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : 10;
      }
      if (typeof val === "number") {
        return Number.isFinite(val) && val >= 0 ? val : 10;
      }
      return 10;
    },
    z.number().nonnegative(),
  ),
  alternativeHolidayDays: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === "") {
        return 0;
      }
      if (typeof val === "string") {
        const parsed = Number(val);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      }
      if (typeof val === "number") {
        return Number.isFinite(val) && val >= 0 ? val : 0;
      }
      return 0;
    },
    z.number().nonnegative(),
  ),
  publicHolidayEntitlement: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === "") {
        return 11; // NZ default: 11 national + regional holidays
      }
      if (typeof val === "string") {
        const parsed = Number(val);
        return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 11;
      }
      if (typeof val === "number") {
        return Number.isFinite(val) && val >= 0 ? Math.floor(val) : 11;
      }
      return 11;
    },
    z.number().int().nonnegative(),
  ),
});

/**
 * Iteratively collect all subordinates (direct and indirect reports)
 * using a queue-based approach instead of recursion.
 * 
 * Benefits:
 * - Avoids stack overflow for deep hierarchies
 * - More predictable memory usage
 * - Easier to debug and test
 * 
 * @param managerUserId - The manager's user ID
 * @param companyId - Company ID for tenant isolation
 * @returns Array of all subordinate user IDs
 */
async function getAllSubordinatesIterative(
  managerUserId: string,
  companyId: string,
): Promise<string[]> {
  const allSubordinates = new Set<string>();
  const queue: string[] = [managerUserId];

  while (queue.length > 0) {
    const currentManagerId = queue.shift()!;

    // Fetch direct reports for current manager
    const directReports = await prisma.user.findMany({
      where: {
        managerId: currentManagerId,
        companyId,
      },
      select: { id: true },
    });

    // Add direct reports to results and queue for processing
    for (const report of directReports) {
      if (!allSubordinates.has(report.id)) {
        allSubordinates.add(report.id);
        queue.push(report.id); // Process their reports too
      }
    }
  }

  return Array.from(allSubordinates);
}

// ✅ GET: Return employees with pagination and optimized signed URL batching
export async function GET(req: Request) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    console.log("[employees] Session check:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      companyId: session?.user?.companyId,
      role: session?.user?.role,
    });
    if (!session?.user?.companyId) {
      console.error("[employees] Unauthorized: missing companyId");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "active"; // active, archived, all
    const userId = searchParams.get("userId");
    const managerId = searchParams.get("managerId");
    const scope = (searchParams.get("scope") || "directory").toLowerCase();
    
    const limitParam = searchParams.get("limit");
    const fetchAll = limitParam === "all";

    const limit = fetchAll
      ? undefined
      : Math.min(
          Math.max(1, parseInt(limitParam || "50", 10)),
          100, // Max 100 per page
        );
    const cursor = searchParams.get("cursor") || undefined;

    // Base scoping
    const whereCondition: any = { companyId: session.user.companyId };

    if (userId) whereCondition.userId = userId;
    if (managerId) whereCondition.user = { managerId };
    if (status === "active") whereCondition.isActive = true;
    else if (status === "archived") whereCondition.isActive = false;
    // If status is "all", no isActive filter is applied

    // Allow admins to explicitly scope to their managed hierarchy
    if (
      scope === "team" &&
      (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN")
    ) {
      const allSubordinateUserIds = await getAllSubordinatesIterative(
        session.user.id,
        session.user.companyId,
      );

      whereCondition.user = {
        ...(whereCondition.user || {}),
        id: { in: allSubordinateUserIds.length > 0 ? allSubordinateUserIds : ["no-match"] },
      };
    }

    // Access control: ADMIN can list all; MANAGER limited to direct and indirect reports
    if (session.user.role === "MANAGER") {
      // Special case: allow managers to fetch their OWN employee record when explicitly queried
      if (userId && userId === session.user.id) {
        // Do not apply team restriction; self-lookup is allowed
      } else {
        // Get all direct and indirect reports using iterative approach
        const allSubordinateUserIds = await getAllSubordinatesIterative(
          session.user.id,
          session.user.companyId,
        );

        // Note: Managers should NOT see themselves in the employee list, only their reports
        // This makes it clear this is a team management view
        const allowedUserIds = allSubordinateUserIds;

        // Combine with any existing whereCondition
        whereCondition.user = {
          ...(whereCondition.user || {}),
          id: { in: allowedUserIds.length > 0 ? allSubordinateUserIds : ["no-match"] }, // Ensure empty array doesn't return all
        };
      }
    } else if (session.user.role === "EMPLOYEE") {
      const requestorEmployee = await prisma.employee.findFirst({
        where: {
          userId: session.user.id,
          companyId: session.user.companyId,
        },
        select: { departmentId: true },
      });

      const orConditions: Prisma.EmployeeWhereInput[] = [
        { userId: session.user.id },
      ];

      if (requestorEmployee?.departmentId) {
        orConditions.push({ departmentId: requestorEmployee.departmentId });
      }

      whereCondition.OR = orConditions;
    }

    // Cursor-based pagination query
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
            managerId: true,
            isActivated: true,
            PermissionProfile: { select: { name: true } },
          },
        },
        Department: {
          select: { id: true, name: true },
        },
        JobRole: {
          select: { id: true, name: true },
        },
        Location: {
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
      take: fetchAll ? undefined : (limit! + 1), // Fetch one extra to determine if there are more results
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    // Determine if there are more results
    const hasMore = fetchAll ? false : employees.length > limit!;
    const results = fetchAll || !hasMore ? employees : employees.slice(0, limit!);
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    // ✅ Batch sign profile URLs (1 operation instead of N)
    const profileSignRequests = results
      .filter((emp) => emp.User.profileImageUrl)
      .map((emp) => ({
        id: emp.User.id,
        path: emp.User.profileImageUrl!,
      }));

    const signedUrlMap = await batchSignProfileUrlsAsMap(profileSignRequests);

    // Map employees to response format with signed URLs from batch
    const flattened = results.map((emp) => {
      const profileUrl = emp.User.profileImageUrl
        ? signedUrlMap.get(emp.User.id) ?? null
        : null;

      return {
        id: emp.id,
        userId: emp.User.id,
        firstName: emp.User.firstName,
        lastName: emp.User.lastName,
        email: emp.User.email,
        phone: emp.User.phone,
        role: emp.User.role,
        createdAt: emp.User.createdAt,
        managerUserId: emp.User.managerId ?? null,
        departmentId: emp.Department?.id ?? null,
        departmentName: emp.Department?.name ?? null,
        jobRoleId: emp.JobRole?.id ?? null,
        jobRoleName: emp.JobRole?.name ?? null,
        locationId: emp.Location?.id ?? null,
        locationName: emp.Location?.name ?? null,
        isActive: emp.isActive,
        isActivated: emp.User.isActivated,
        offboardingStatus: emp.offboardingStatus,
        lastWorkingDate: emp.lastWorkingDate,
        offboardingRecord: emp.EmployeeOffboarding,
        profileImageUrl: profileUrl,
        permissionProfileName: emp.User.PermissionProfile?.name ?? null,
        // NZ Leave Compliance Fields
        sickLeaveDaysPerYear: emp.sickLeaveDaysPerYear,
        alternativeHolidayBalance: emp.alternativeHolidayBalance,
        publicHolidaysPerYear: emp.publicHolidaysPerYear,
        employmentStartDate: emp.employmentStartDate,
      } as const;
    });

    console.log(`[employees] Found ${flattened.length} employees for companyId: ${session.user.companyId}`);
    
    return NextResponse.json({
      data: flattened,
      pagination: {
        limit,
        cursor: nextCursor,
        hasMore,
      },
    });
  } catch (error) {
    console.error("[employees] Error details:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
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
      locationId,
      siteLocation,
      contractType,
      sendInviteNow = false,
      onboardingTemplateId,
      holidayYear,
      workingPatternId,
      entitlementDays,
      sickLeaveDays,
      alternativeHolidayDays,
      publicHolidayEntitlement,
    } = createEmployeeSchema.parse(await req.json());

    // ✅ Enforce global email uniqueness across all tenants
    const existingAnywhere = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } as any },
      select: { id: true, companyId: true, isActivated: true },
    });
    if (existingAnywhere && existingAnywhere.companyId !== companyId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This email is already in use in another tenant. Please use a different email.",
        },
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

    // Derive siteLocation label if missing and locationId is provided
    let siteLocationLabel: string | undefined = siteLocation || undefined;
    if (!siteLocationLabel && locationId) {
      const loc = await prisma.location.findFirst({
        where: { id: locationId, OR: [{ companyId }, { companyId: null }] },
        select: { name: true },
      });
      siteLocationLabel = loc?.name ?? undefined;
    }

    const employee = await prisma.employee.create({
      data: {
        id: crypto.randomUUID(),
        User: { connect: { id: user.id } },
        isActive: true,
        // Persist canonical employment details
        startDate: new Date(startDate),
        employmentStartDate: new Date(startDate), // Store for anniversary calculations
        Department: departmentId
          ? { connect: { id: departmentId } }
          : undefined,
        JobRole: jobRoleId
          ? { connect: { id: jobRoleId } }
          : undefined,
        // Link Working Pattern via relation (checked create input)
        WorkingPattern: workingPatternId
          ? { connect: { id: workingPatternId } }
          : undefined,
        Company: { connect: { id: companyId! } }, // ✅ use relation connect
        OnboardingTemplate: normalizedTemplateId
          ? { connect: { id: normalizedTemplateId } }
          : undefined,
        Location: locationId
          ? { connect: { id: locationId } }
          : undefined,
        siteLocation: siteLocationLabel,
        contractType: contractType || undefined,
        // NZ Leave Compliance Fields
        sickLeaveDaysPerYear: sickLeaveDays,
        alternativeHolidayBalance: alternativeHolidayDays,
        publicHolidaysPerYear: publicHolidayEntitlement,
        // Initialize sick leave balance with the annual entitlement
        sickLeaveBalance: sickLeaveDays * 8, // Convert to hours (8 hours per day)
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
    const activationLink = `${appBaseUrl}/activate?token=${activationToken}&companyId=${encodeURIComponent(
      companyId,
    )}&redirect=${encodeURIComponent(redirectPath)}`;

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

