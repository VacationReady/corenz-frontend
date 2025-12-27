import { NextRequest, NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { getMobileSession } from "@/lib/mobile-session";
import { canAccessEmployee } from "@/lib/permissions";
import { z } from "zod";
import supabase from "@/lib/supabase-admin";
import { resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "@/lib/email/template";
import { batchSignProfileUrlsAsMap } from "@/lib/storage/signProfiles";
import { roundToTwoDecimals } from "@/lib/decimalPrecision";
import { decryptSensitiveData } from "@/lib/crypto";

const toNumber = (value: any) =>
  value === null || value === undefined ? null : Number(value);

const isPrismaDecimal = (value: any) =>
  value && typeof value === "object" && typeof value.toNumber === "function";

const serializeValue = (value: any): any => {
  if (value instanceof Date) return value.toISOString();
  if (isPrismaDecimal(value)) return toNumber(value);

  if (Array.isArray(value)) return value.map(serializeValue);

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, serializeValue(v)]),
    );
  }

  return value ?? null;
};

const serializeOffboardingRecord = (record: any) =>
  record ? serializeValue(record) : null;

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
        // Round to 2 decimal places (NZ HRIS requirement)
        return Number.isFinite(parsed) ? roundToTwoDecimals(parsed) : undefined;
      }
      if (typeof val === "number") {
        // Round to 2 decimal places (NZ HRIS requirement)
        return Number.isFinite(val) ? roundToTwoDecimals(val) : undefined;
      }
      return undefined;
    },
    z.number().nonnegative().optional(),
  ),
  // NZ Leave Compliance Fields (all rounded to 2 decimal places per HRIS requirements)
  sickLeaveDays: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === "") {
        return 10; // NZ default: 10 days after 6 months
      }
      if (typeof val === "string") {
        const parsed = Number(val);
        return Number.isFinite(parsed) && parsed >= 0
          ? roundToTwoDecimals(parsed)
          : 10;
      }
      if (typeof val === "number") {
        return Number.isFinite(val) && val >= 0 ? roundToTwoDecimals(val) : 10;
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
        return Number.isFinite(parsed) && parsed >= 0
          ? roundToTwoDecimals(parsed)
          : 0;
      }
      if (typeof val === "number") {
        return Number.isFinite(val) && val >= 0 ? roundToTwoDecimals(val) : 0;
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
  // Allow employee to book leave on public holidays (for contractors without public holiday entitlement)
  canBookPublicHolidays: z.boolean().optional().default(false),
  // 90-day trial period fields (NZ Employment Relations Act 2000)
  ninetyDayTrialPeriod: z.boolean().optional().default(false),
  trialPeriodAccepted: z.boolean().optional().default(false),
  trialPeriodAcceptedAt: optionalTrimmedString,
  trialNotifyRecipient: z.enum(["MANAGER", "ADMIN", "BOTH"]).optional(),
  trialNotifyDaysBefore: z.number().int().min(1).max(30).optional(),
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
export async function GET(req: NextRequest) {
  try {
    await ensurePrismaConnected();
    const session = await getMobileSession(req);
    const requestStartMs = Date.now();
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
    const workingPatternType = searchParams.get("workingPatternType"); // Filter by pattern type (SHIFT_BASED, STANDARD, etc.)
    const searchQuery = (searchParams.get("q") || searchParams.get("search") || "").trim();
    const departmentsParam = (searchParams.get("departments") || "").trim();
    const jobRolesParam = (searchParams.get("jobRoles") || "").trim();

    const limitParam = searchParams.get("limit");
    if (limitParam === "all") {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: { limit: "limit=all is not supported; use cursor-based pagination" },
        },
        { status: 400 },
      );
    }

    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 50;
    const limit = Math.min(
      Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 50),
      100, // Max 100 per page
    );
    const cursor = searchParams.get("cursor") || undefined;
    const skipParam = searchParams.get("skip");
    const parsedSkip = skipParam ? parseInt(skipParam, 10) : 0;
    const skip = Number.isFinite(parsedSkip) && parsedSkip > 0 ? parsedSkip : 0;
    if (skip > 10000) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: { skip: "skip is too large; use cursor-based pagination" },
        },
        { status: 400 },
      );
    }

    // Base scoping
    const whereCondition: any = { companyId: session.user.companyId };

    if (userId) whereCondition.userId = userId;
    if (managerId) whereCondition.User = { managerId };
    if (status === "active") whereCondition.isActive = true;
    else if (status === "archived") whereCondition.isActive = false;
    // If status is "all", no isActive filter is applied

    // Filter by working pattern type (for rota scheduling - filter to SHIFT_BASED workers)
    // Check BOTH direct WorkingPattern AND EmployeeWorkingPatternAssignment
    // because patterns can be assigned either way:
    // - Direct: Employee.workingPatternId (legacy/simple assignment)
    // - Assignment: EmployeeWorkingPatternAssignment table (with effective dates - preferred approach)
    if (workingPatternType) {
      const patternFilter = {
        OR: [
          { WorkingPattern: { patternType: workingPatternType } },
          {
            EmployeeWorkingPatternAssignment: {
              some: {
                WorkingPattern: { patternType: workingPatternType },
              },
            },
          },
        ],
      };

      whereCondition.AND = whereCondition.AND || [];
      whereCondition.AND.push(patternFilter);
    }

    const departments = departmentsParam
      ? departmentsParam
          .split(",")
          .map((s) => decodeURIComponent(s).trim())
          .filter(Boolean)
      : [];

    const jobRoles = jobRolesParam
      ? jobRolesParam
          .split(",")
          .map((s) => decodeURIComponent(s).trim())
          .filter(Boolean)
      : [];

    if (departments.length > 0) {
      whereCondition.AND = whereCondition.AND || [];
      whereCondition.AND.push({
        Department: {
          is: {
            name: { in: departments },
          },
        },
      });
    }

    if (jobRoles.length > 0) {
      whereCondition.AND = whereCondition.AND || [];
      whereCondition.AND.push({
        JobRole: {
          is: {
            name: { in: jobRoles },
          },
        },
      });
    }

    if (searchQuery) {
      whereCondition.AND = whereCondition.AND || [];
      whereCondition.AND.push({
        OR: [
          { User: { firstName: { contains: searchQuery, mode: "insensitive" } } },
          { User: { lastName: { contains: searchQuery, mode: "insensitive" } } },
          { User: { email: { contains: searchQuery, mode: "insensitive" } } },
          { Department: { is: { name: { contains: searchQuery, mode: "insensitive" } } } },
          { JobRole: { is: { name: { contains: searchQuery, mode: "insensitive" } } } },
        ],
      });
    }

    // Allow admins to explicitly scope to their managed hierarchy
    if (
      scope === "team" &&
      (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN")
    ) {
      const allSubordinateUserIds = await getAllSubordinatesIterative(
        session.user.id,
        session.user.companyId,
      );

      whereCondition.User = {
        ...(whereCondition.User || {}),
        id: { in: allSubordinateUserIds.length > 0 ? allSubordinateUserIds : ["no-match"] },
      };
    }

    // Access control: ADMIN can list all; MANAGER limited to department + reports
    if (session.user.role === "MANAGER") {
      // Special case: allow managers to fetch their OWN employee record when explicitly queried
      if (userId && userId === session.user.id) {
        // Do not apply team restriction; self-lookup is allowed
      } else if (scope === "direct") {
        // Only direct reports (single level)
        const directReports = await prisma.user.findMany({
          where: {
            managerId: session.user.id,
            companyId: session.user.companyId,
          },
          select: { id: true },
        });

        const directIds = directReports.map((u) => u.id);

        whereCondition.User = {
          ...(whereCondition.User || {}),
          id: { in: directIds.length > 0 ? directIds : ["no-match"] },
        };
      } else {
        // Manager scope: department colleagues + all direct/indirect reports
        // This mirrors employee access (see their department) plus manager access (see their reports)
        const managerEmployee = await prisma.employee.findFirst({
          where: {
            userId: session.user.id,
            companyId: session.user.companyId,
          },
          select: { departmentId: true },
        });

        const allSubordinateUserIds = await getAllSubordinatesIterative(
          session.user.id,
          session.user.companyId,
        );

        const orConditions: Prisma.EmployeeWhereInput[] = [];

        // Include self
        orConditions.push({ userId: session.user.id });

        // Include department colleagues (if manager has a department)
        if (managerEmployee?.departmentId) {
          orConditions.push({ departmentId: managerEmployee.departmentId });
        }

        // Include all direct and indirect reports (regardless of department)
        if (allSubordinateUserIds.length > 0) {
          orConditions.push({ userId: { in: allSubordinateUserIds } });
        }

        whereCondition.OR = orConditions;
      }
    } else if (session.user.role === "EMPLOYEE") {
      const requestorEmployee = await prisma.employee.findFirst({
        where: {
          userId: session.user.id,
          companyId: session.user.companyId,
        },
        select: { departmentId: true },
      });

      const orConditions: Prisma.EmployeeWhereInput[] = [{ userId: session.user.id }];

      if (requestorEmployee?.departmentId) {
        orConditions.push({ departmentId: requestorEmployee.departmentId });
      }

      whereCondition.OR = orConditions;
    }

    // Cursor-based pagination query
    const queryStartMs = Date.now();
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
        WorkingPattern: {
          select: { id: true, name: true, patternType: true },
        },
        // Include working pattern assignments (with effective dates) - this is the preferred way to assign patterns
        EmployeeWorkingPatternAssignment: {
          include: {
            WorkingPattern: {
              select: { id: true, name: true, patternType: true },
            },
          },
          orderBy: { effectiveDate: "desc" as const },
          take: 1, // Only get the most recent assignment
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
      orderBy: [
        { User: { firstName: "asc" } },
        { User: { lastName: "asc" } },
        { id: "asc" },
      ],
      take: limit + 1, // Fetch one extra to determine if there are more results
      // Support both cursor-based and offset-based pagination
      // Cursor takes precedence if provided (for backward compatibility)
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : { skip: skip }),
    });
    const queryDurationMs = Date.now() - queryStartMs;

    // Determine if there are more results
    const hasMore = employees.length > limit;
    const results = hasMore ? employees.slice(0, limit) : employees;
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
    const toISOString = (value: any) =>
      value instanceof Date ? value.toISOString() : value ?? null;

    const flattened = results.map((emp) => {
      const profileUrl = emp.User.profileImageUrl
        ? signedUrlMap.get(emp.User.id) ?? null
        : null;

      // Prioritize assignment-based working pattern (with effective dates) over direct relationship
      // This ensures employees assigned via the settings page are properly identified
      const effectiveWorkingPattern =
        emp.EmployeeWorkingPatternAssignment?.[0]?.WorkingPattern || emp.WorkingPattern;

      const toNumber = (value: any) =>
        value === null || value === undefined ? null : Number(value);

      const toISOString = (value: any) =>
        value instanceof Date ? value.toISOString() : value ?? null;

      const isPrismaDecimal = (value: any) =>
        value && typeof value === "object" && typeof value.toNumber === "function";

      const normalizeValue = (value: any) => {
        if (value instanceof Date) {
          return toISOString(value);
        }

        if (isPrismaDecimal(value)) {
          return toNumber(value);
        }

        return value ?? null;
      };

      const serializeOffboardingRecord = (record: any) => {
        if (!record) return null;

        return Object.fromEntries(
          Object.entries(record).map(([key, value]) => [key, normalizeValue(value)]),
        );
      };

      return {
        id: emp.id,
        userId: emp.User.id,
        firstName: emp.User.firstName,
        lastName: emp.User.lastName,
        email: emp.User.email,
        phone: emp.User.phone,
        role: emp.User.role,
        createdAt: toISOString(emp.User.createdAt),
        managerUserId: emp.User.managerId ?? null,
        departmentId: emp.Department?.id ?? null,
        departmentName: emp.Department?.name ?? null,
        jobRoleId: emp.JobRole?.id ?? null,
        jobRoleName: emp.JobRole?.name ?? null,
        locationId: emp.Location?.id ?? null,
        locationName: emp.Location?.name ?? null,
        workingPatternId: effectiveWorkingPattern?.id ?? null,
        workingPatternName: effectiveWorkingPattern?.name ?? null,
        workingPatternType: effectiveWorkingPattern?.patternType ?? null,
        isActive: emp.isActive,
        isActivated: emp.User.isActivated,
        offboardingStatus: emp.offboardingStatus,
        lastWorkingDate: toISOString(emp.lastWorkingDate),
        offboardingRecord: serializeOffboardingRecord(emp.EmployeeOffboarding),
        profileImageUrl: profileUrl,
        permissionProfileName: emp.User.PermissionProfile?.name ?? null,
        // NZ Leave Compliance Fields - normalize Decimal to number for client safety
        sickLeaveDaysPerYear: toNumber(emp.sickLeaveDaysPerYear),
        alternativeHolidayBalance: toNumber(emp.alternativeHolidayBalance),
        publicHolidaysPerYear: toNumber(emp.publicHolidaysPerYear),
        employmentStartDate: toISOString(emp.employmentStartDate),
      } as const;
    });

    console.log(
      `[employees] Found ${flattened.length} employees for companyId: ${session.user.companyId}`,
    );
    console.log("[employees] GET metrics:", {
      companyId: session.user.companyId,
      count: flattened.length,
      limit,
      hasMore,
      cursorProvided: !!cursor,
      skip,
      scope,
      status,
      queryDurationMs,
      totalDurationMs: Date.now() - requestStartMs,
    });

    return NextResponse.json({
      data: serializeValue(flattened),
      pagination: {
        limit,
        cursor: nextCursor,
        skip: skip + results.length,
        hasMore,
      },
    });
  } catch (error) {
    console.error("[employees] Error details:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json({ error: "Error loading employees" }, { status: 500 });
  }
}

// ✅ POST: Add new employee with companyId scoping and activation email
export async function POST(req: NextRequest) {
  try {
    const session = await getMobileSession(req);

    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized or missing company context." },
        { status: 401 },
      );
    }

    const companyId = session.user.companyId;
    const appBaseUrl = getAppBaseUrl();

    const body = await req.json();
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
      canBookPublicHolidays,
      ninetyDayTrialPeriod,
      trialPeriodAccepted,
      trialPeriodAcceptedAt,
      trialNotifyRecipient,
      trialNotifyDaysBefore,
    } = createEmployeeSchema.parse(body);

    // Extract bank/payroll and emergency contact fields (not in schema to keep them optional)
    // These fields may be encrypted from the client, so we need to decrypt them
    let bankAccountNumber: string | undefined;
    let irdNumber: string | undefined;
    let workPermitType: string | undefined;
    
    // Decrypt sensitive fields if they appear to be encrypted (contain colons indicating IV:AuthTag:Ciphertext format)
    const isEncrypted = (value: string) => value.includes(':') && value.split(':').length === 3;
    
    if (typeof body.bankAccountNumber === "string" && body.bankAccountNumber.trim()) {
      const rawValue = body.bankAccountNumber.trim();
      if (isEncrypted(rawValue)) {
        try {
          bankAccountNumber = await decryptSensitiveData(rawValue);
        } catch (e) {
          console.warn("[employees/POST] Failed to decrypt bankAccountNumber, using raw value:", e);
          bankAccountNumber = rawValue;
        }
      } else {
        bankAccountNumber = rawValue;
      }
    }
    
    if (typeof body.irdNumber === "string" && body.irdNumber.trim()) {
      const rawValue = body.irdNumber.trim();
      if (isEncrypted(rawValue)) {
        try {
          irdNumber = await decryptSensitiveData(rawValue);
        } catch (e) {
          console.warn("[employees/POST] Failed to decrypt irdNumber, using raw value:", e);
          irdNumber = rawValue;
        }
      } else {
        irdNumber = rawValue;
      }
    }
    
    if (typeof body.workPermitType === "string" && body.workPermitType.trim()) {
      const rawValue = body.workPermitType.trim();
      if (isEncrypted(rawValue)) {
        try {
          workPermitType = await decryptSensitiveData(rawValue);
        } catch (e) {
          console.warn("[employees/POST] Failed to decrypt workPermitType, using raw value:", e);
          workPermitType = rawValue;
        }
      } else {
        workPermitType = rawValue;
      }
    }
    
    const taxCode = typeof body.taxCode === "string" ? body.taxCode.trim() : undefined;
    const kiwiSaverEnrolled = typeof body.kiwiSaverEnrolled === "boolean" ? body.kiwiSaverEnrolled : undefined;
    const kiwiSaverEmployeeRate = typeof body.kiwiSaverEmployeeRate === "number" ? body.kiwiSaverEmployeeRate : undefined;
    const visaExpiryDate = typeof body.visaExpiryDate === "string" && body.visaExpiryDate.trim() ? body.visaExpiryDate.trim() : undefined;
    
    // Emergency contact fields
    const emergencyContactName = typeof body.emergencyContactName === "string" ? body.emergencyContactName.trim() : undefined;
    const emergencyContactPhone = typeof body.emergencyContactPhone === "string" ? body.emergencyContactPhone.trim() : undefined;
    const emergencyContactRelationship = typeof body.emergencyContactRelationship === "string" ? body.emergencyContactRelationship.trim() : undefined;

    // Extract rotaGroupIds separately (not in schema to keep it optional)
    const rotaGroupIds: string[] = Array.isArray(body.rotaGroupIds) ? body.rotaGroupIds : [];

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
    // Use tenant-scoped query to prevent cross-tenant ID leakage
    let managerUserId: string | null = null;
    if (managerId && managerId.trim() !== "") {
      const managerEmployee = await prisma.employee.findFirst({
        where: { id: managerId, companyId },
        select: { userId: true },
      });

      if (!managerEmployee) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid manager: the specified manager does not exist or belongs to a different company.",
          },
          { status: 400 },
        );
      }
      managerUserId = managerEmployee.userId;
    }

    // ✅ Validate tenant-scoped foreign keys to prevent cross-tenant linking
    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, companyId },
        select: { id: true },
      });
      if (!dept) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid department: does not exist or belongs to a different company.",
          },
          { status: 400 },
        );
      }
    }

    if (jobRoleId) {
      const jobRole = await prisma.jobRole.findFirst({
        where: { id: jobRoleId, companyId },
        select: { id: true },
      });
      if (!jobRole) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid job role: does not exist or belongs to a different company.",
          },
          { status: 400 },
        );
      }
    }

    if (locationId) {
      // Locations can be company-specific or global (companyId: null)
      const location = await prisma.location.findFirst({
        where: { id: locationId, OR: [{ companyId }, { companyId: null }] },
        select: { id: true },
      });
      if (!location) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid location: does not exist or belongs to a different company.",
          },
          { status: 400 },
        );
      }
    }

    if (workingPatternId) {
      const pattern = await prisma.workingPattern.findFirst({
        where: { id: workingPatternId, companyId },
        select: { id: true },
      });
      if (!pattern) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid working pattern: does not exist or belongs to a different company.",
          },
          { status: 400 },
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
        Department: departmentId ? { connect: { id: departmentId } } : undefined,
        JobRole: jobRoleId ? { connect: { id: jobRoleId } } : undefined,
        // Link Working Pattern via relation (checked create input)
        WorkingPattern: workingPatternId ? { connect: { id: workingPatternId } } : undefined,
        Company: { connect: { id: companyId! } }, // ✅ use relation connect
        OnboardingTemplate: normalizedTemplateId
          ? { connect: { id: normalizedTemplateId } }
          : undefined,
        Location: locationId ? { connect: { id: locationId } } : undefined,
        siteLocation: siteLocationLabel,
        contractType: contractType || undefined,
        // NZ Bank & Payroll Fields (persisted from AddEmployeeModal)
        bankAccountNumber: bankAccountNumber || undefined,
        irdNumber: irdNumber || undefined,
        taxCode: taxCode as any || undefined,
        kiwiSaverEnrolled: kiwiSaverEnrolled ?? undefined,
        kiwiSaverEmployeeRate: kiwiSaverEmployeeRate ?? undefined,
        visaExpiryDate: visaExpiryDate ? new Date(visaExpiryDate) : undefined,
        workPermitType: workPermitType || undefined,
        // NZ Leave Compliance Fields
        sickLeaveDaysPerYear: sickLeaveDays,
        alternativeHolidayBalance: alternativeHolidayDays,
        publicHolidaysPerYear: publicHolidayEntitlement,
        // NZ SICK LEAVE REFACTOR: Do NOT seed sickLeaveBalance.
        // Sick leave is now anniversary-grant based per Holidays Act 2003.
        // Balance starts at 0 and is granted via the ledger system after 6 months.
        // See lib/leave/nz-sick-leave-ledger.ts
        sickLeaveBalance: 0,
        // Set eligibility date (6 months from start)
        sickLeaveEligibilityDate: new Date(
          new Date(startDate).setMonth(new Date(startDate).getMonth() + 6),
        ),
        // Public holiday leave booking permission
        canBookPublicHolidays: canBookPublicHolidays ?? false,
        // 90-day trial period fields (NZ Employment Relations Act 2000)
        ninetyDayTrialPeriod: ninetyDayTrialPeriod ?? false,
        trialPeriodAccepted: trialPeriodAccepted ?? false,
        trialPeriodAcceptedAt: trialPeriodAcceptedAt
          ? new Date(trialPeriodAcceptedAt)
          : undefined,
        // Calculate trial end date (90 days from start)
        trialPeriodEndDate: ninetyDayTrialPeriod
          ? new Date(new Date(startDate).getTime() + 90 * 24 * 60 * 60 * 1000)
          : undefined,
        trialNotifyRecipient: ninetyDayTrialPeriod ? trialNotifyRecipient : undefined,
        trialNotifyDaysBefore: ninetyDayTrialPeriod ? trialNotifyDaysBefore : undefined,
      },
    });

    // ✅ Create EmergencyContact if provided (persisted from AddEmployeeModal)
    if (emergencyContactName) {
      try {
        await prisma.emergencyContact.create({
          data: {
            id: crypto.randomUUID(),
            employeeId: employee.id,
            name: emergencyContactName,
            phone: emergencyContactPhone || undefined,
            relationship: emergencyContactRelationship || undefined,
          },
        });
        console.log(`[employees/POST] Created emergency contact for employee ${employee.id}`);
      } catch (e) {
        console.warn("Emergency contact creation failed:", e);
      }
    }

    // ✅ Auto-promote manager and apply Manager permission profile within company
    //    - Only elevate EMPLOYEE to MANAGER
    //    - Never downgrade an ADMIN to MANAGER
    if (managerUserId) {
      try {
        // Ensure the new employee points to this manager as their line manager
        // managerUserId was already validated above with tenant-scoped query
        await prisma.user.update({
          where: { id: user.id },
          data: { managerId: managerUserId },
        });

        const mgrUser = await prisma.user.findUnique({
          where: { id: managerUserId },
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
            where: { id: managerUserId },
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

    // Create or update activation token (upsert handles re-invites)
    await prisma.activationToken.upsert({
      where: { userId: user.id },
      update: {
        token: activationToken,
        createdAt: new Date(), // Reset creation time on update
      },
      create: {
        id: crypto.randomUUID(),
        token: activationToken,
        userId: user.id,
      },
    });

    console.log(`[employees/POST] Activation token created/updated for user ${user.id}`);

    const redirectPath = normalizedTemplateId ? `/${employee.id}/onboarding` : `/dashboard`;
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
            totalDays: roundToTwoDecimals(entitlementDays),
            usedDays: 0,
            companyId,
            updatedAt: new Date(),
          },
        });
      } catch (e) {
        console.warn("Leave entitlement creation failed:", e);
      }
    }

    // Create rota group memberships for shift-based scheduling
    if (rotaGroupIds.length > 0) {
      try {
        // Verify all rota groups belong to this company
        const validRotaGroups = await prisma.rotaGroup.findMany({
          where: {
            id: { in: rotaGroupIds },
            companyId,
            isActive: true,
          },
          select: { id: true },
        });

        const validGroupIds = validRotaGroups.map((g) => g.id);

        // Create memberships for valid groups
        if (validGroupIds.length > 0) {
          await prisma.rotaGroupMember.createMany({
            data: validGroupIds.map((rotaGroupId) => ({
              id: crypto.randomUUID(),
              rotaGroupId,
              employeeId: employee.id,
              isActive: true,
              addedBy: session.user.id,
              addedAt: new Date(),
            })),
            skipDuplicates: true,
          });
          console.log(
            `[employees/POST] Added employee ${employee.id} to ${validGroupIds.length} rota groups`,
          );
        }
      } catch (e) {
        console.warn("Rota group membership creation failed:", e);
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
