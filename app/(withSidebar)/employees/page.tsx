/**
 * Employees Directory - Server Component
 * 
 * Next.js 15 server component that fetches initial employee data server-side.
 * This provides fast initial page loads and SEO benefits.
 * 
 * Architecture:
 * - Server: Fetches first page of employees (50), departments, and job roles
 * - Client: Handles interactivity (filters, modals, pagination, mutations)
 * 
 * Related:
 * - Prompt 6: Paginated /api/employees endpoint
 * - Prompt 7: Client-side pagination implementation
 * - Prompt 8: Server-first architecture refactor
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { batchSignProfileUrlsAsMap } from "@/lib/storage/signProfiles";
import EmployeesPageClient from "./EmployeesClient";
import type { Prisma } from "@prisma/client";

/**
 * Iteratively collect all subordinates (direct and indirect reports)
 * using a queue-based approach instead of recursion.
 * Duplicated from API route to ensure server component applies same filtering.
 */
async function getAllSubordinatesIterative(
  managerUserId: string,
  companyId: string,
): Promise<string[]> {
  const allSubordinates = new Set<string>();
  const queue: string[] = [managerUserId];

  while (queue.length > 0) {
    const currentManagerId = queue.shift()!;

    const directReports = await prisma.user.findMany({
      where: {
        managerId: currentManagerId,
        companyId,
      },
      select: { id: true },
    });

    for (const report of directReports) {
      if (!allSubordinates.has(report.id)) {
        allSubordinates.add(report.id);
        queue.push(report.id);
      }
    }
  }

  return Array.from(allSubordinates);
}

export const dynamic = "force-dynamic";

/**
 * Fetch initial employee data server-side
 * Directly queries database instead of API route to avoid auth issues
 */
async function getInitialData(status: "active" | "archived" | "all" = "active") {
  const session = await auth();
  
  if (!session?.user?.companyId) {
    redirect("/login");
  }

  try {
    const limit = 50;
    
    // Build where condition based on status
    const whereCondition: Prisma.EmployeeWhereInput = { companyId: session.user.companyId };
    if (status === "active") whereCondition.isActive = true;
    else if (status === "archived") whereCondition.isActive = false;

    // SECURITY: Apply role-based filtering to prevent data exposure
    // This must match the logic in /api/employees/route.ts
    const userRole = session.user.role;
    
    if (userRole === "MANAGER") {
      // Managers see only their direct and indirect reports
      const allSubordinateUserIds = await getAllSubordinatesIterative(
        session.user.id,
        session.user.companyId,
      );
      
      whereCondition.userId = {
        in: allSubordinateUserIds.length > 0 ? allSubordinateUserIds : ["no-match"],
      };
    } else if (userRole === "EMPLOYEE") {
      // Employees see only themselves and their department colleagues
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
    // ADMIN and SUPER_ADMIN see all employees (no additional filtering)

    // Fetch employees with role-based filtering applied
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
      orderBy: [
        { User: { firstName: "asc" } },
        { User: { lastName: "asc" } },
        { id: "asc" },
      ],
      take: limit + 1,
    });

    // Count with same role-based filtering for accurate counts
    const baseCountWhere: Prisma.EmployeeWhereInput = { companyId: session.user.companyId };
    
    // Apply same role-based filtering to counts
    if (userRole === "MANAGER") {
      const allSubordinateUserIds = await getAllSubordinatesIterative(
        session.user.id,
        session.user.companyId,
      );
      baseCountWhere.userId = {
        in: allSubordinateUserIds.length > 0 ? allSubordinateUserIds : ["no-match"],
      };
    } else if (userRole === "EMPLOYEE") {
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

      baseCountWhere.OR = orConditions;
    }
    
    const [activeCount, archivedCount] = await Promise.all([
      prisma.employee.count({
        where: { ...baseCountWhere, isActive: true },
      }),
      prisma.employee.count({
        where: { ...baseCountWhere, isActive: false },
      }),
    ]);

    const totalCount = activeCount + archivedCount;

    // Determine pagination
    const hasMore = employees.length > limit;
    const results = hasMore ? employees.slice(0, limit) : employees;
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    // Batch sign profile URLs
    const profileSignRequests = results
      .filter((emp) => emp.User.profileImageUrl)
      .map((emp) => ({
        id: emp.User.id,
        path: emp.User.profileImageUrl!,
      }));

    const signedProfileMap = await batchSignProfileUrlsAsMap(profileSignRequests);

    // Format employees with signed URLs - flatten the structure to match client expectations
    // IMPORTANT: Only include serializable fields - Prisma Decimal objects cannot be passed to Client Components
    const toNumber = (value: any) =>
      value === null || value === undefined ? null : Number(value);

    const toISOString = (value: any) =>
      value instanceof Date ? value.toISOString() : value ?? null;

    const isPrismaDecimal = (value: any) =>
      value && typeof value === "object" && typeof value.toNumber === "function";

    const serializeValue = (value: any): any => {
      if (value instanceof Date) return toISOString(value);
      if (isPrismaDecimal(value)) return toNumber(value);
      if (Array.isArray(value)) return value.map(serializeValue);
      if (value && typeof value === "object") {
        return Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, serializeValue(v)]),
        );
      }

      return value ?? null;
    };

    const formattedEmployees = results.map((emp) => ({
      // Only include the fields the client actually needs - avoid spreading ...emp which includes Decimal fields
      id: emp.id,
      userId: emp.userId,
      isActive: emp.isActive,
      departmentId: emp.departmentId,
      jobRoleId: emp.jobRoleId,
      locationId: emp.locationId,
      onboardingStatus: emp.onboardingStatus,
      offboardingStatus: emp.offboardingStatus,
      lastWorkingDate: toISOString(emp.lastWorkingDate),
      startDate: toISOString(emp.startDate),
      contractType: emp.contractType,
      // Flatten User fields to top level for backward compatibility
      firstName: emp.User.firstName,
      lastName: emp.User.lastName,
      email: emp.User.email,
      phone: emp.User.phone,
      role: emp.User.role,
      isActivated: emp.User.isActivated,
      profileImageUrl: signedProfileMap.get(emp.User.id) || emp.User.profileImageUrl,
      // Flatten department and job role names for table filters
      departmentName: emp.Department?.name,
      jobRoleName: emp.JobRole?.name,
      user: {
        id: emp.User.id,
        firstName: emp.User.firstName,
        lastName: emp.User.lastName,
        email: emp.User.email,
        phone: emp.User.phone,
        role: emp.User.role,
        isActivated: emp.User.isActivated,
        profileImageUrl: signedProfileMap.get(emp.User.id) || emp.User.profileImageUrl,
      },
      department: emp.Department ? { id: emp.Department.id, name: emp.Department.name } : null,
      jobRole: emp.JobRole ? { id: emp.JobRole.id, name: emp.JobRole.name } : null,
      location: emp.Location ? { id: emp.Location.id, name: emp.Location.name } : null,
      offboarding: emp.EmployeeOffboarding ? serializeValue(emp.EmployeeOffboarding) : null,
      offboardingRecord: emp.EmployeeOffboarding
        ? serializeValue(emp.EmployeeOffboarding)
        : null,
      // Normalize any Decimal fields we may need later; keep numbers primitive for client safety
      sickLeaveDaysPerYear: toNumber((emp as any).sickLeaveDaysPerYear),
      alternativeHolidayBalance: toNumber((emp as any).alternativeHolidayBalance),
      publicHolidaysPerYear: toNumber((emp as any).publicHolidaysPerYear),
      employmentStartDate: toISOString((emp as any).employmentStartDate),
    }));

    // Fetch departments and job roles
    const [departments, jobRoles] = await Promise.all([
      prisma.department.findMany({
        where: { companyId: session.user.companyId },
        orderBy: { name: "asc" },
      }),
      prisma.jobRole.findMany({
        where: { companyId: session.user.companyId },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      initialEmployees: serializeValue(formattedEmployees) as any, // Type cast - Prisma types don't exactly match client Employee type
      initialPagination: { cursor: nextCursor, hasMore, limit },
      departments: serializeValue(departments),
      jobRoles: serializeValue(jobRoles),
      initialCounts: serializeValue({
        active: activeCount,
        archived: archivedCount,
        all: totalCount,
      }),
    };
  } catch (error) {
    console.error("[EmployeesPage] Failed to fetch initial data:", error);
    return {
      initialEmployees: [],
      initialPagination: { cursor: null, hasMore: false, limit: 50 },
      departments: [],
      jobRoles: [],
      initialCounts: {
        active: 0,
        archived: 0,
        all: 0,
      },
    };
  }
}

export default async function EmployeesPage() {
  const data = await getInitialData("active");
  
  return (
    <EmployeesPageClient
      initialEmployees={data.initialEmployees}
      initialPagination={data.initialPagination}
      departments={data.departments}
      jobRoles={data.jobRoles}
      initialCounts={data.initialCounts}
    />
  );
}
