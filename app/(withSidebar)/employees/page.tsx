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
    const whereCondition: any = { companyId: session.user.companyId };
    if (status === "active") whereCondition.isActive = true;
    else if (status === "archived") whereCondition.isActive = false;

    // Fetch employees with same logic as API route
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
      take: limit + 1,
    });

    const [activeCount, archivedCount] = await Promise.all([
      prisma.employee.count({
        where: { companyId: session.user.companyId, isActive: true },
      }),
      prisma.employee.count({
        where: { companyId: session.user.companyId, isActive: false },
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
    const formattedEmployees = results.map((emp) => ({
      ...emp,
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
        ...emp.User,
        profileImageUrl: signedProfileMap.get(emp.User.id) || emp.User.profileImageUrl,
      },
      department: emp.Department,
      jobRole: emp.JobRole,
      location: emp.Location,
      offboarding: emp.EmployeeOffboarding,
      offboardingRecord: emp.EmployeeOffboarding,
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
      initialEmployees: formattedEmployees as any, // Type cast - Prisma types don't exactly match client Employee type
      initialPagination: { cursor: nextCursor, hasMore, limit },
      departments,
      jobRoles,
      initialCounts: {
        active: activeCount,
        archived: archivedCount,
        all: totalCount,
      },
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
