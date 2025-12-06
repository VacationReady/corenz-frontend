/**
 * Admin Dashboard - Server-Side Data Fetching
 * 
 * Centralized data fetching functions for the admin dashboard.
 * These run on the server and provide initial data to client components.
 * 
 * Architecture:
 * - Server: Fetch static/initial data (metrics, who's off)
 * - Client: Use SWR for dynamic/frequently changing data (action items, approvals)
 * 
 * Related:
 * - Prompt 8: Server-first architecture pattern
 * - Prompt 9: AdminDashboard refactor with SWR
 */

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";

/**
 * Fetch dashboard metrics (headcount, managers, new starters, pending approvals)
 * These are relatively static and benefit from server-side rendering
 */
export async function getDashboardMetrics(companyId: string, userId: string, departmentId?: string) {
  const session = await auth();
  
  if (!session?.user?.companyId || session.user.companyId !== companyId) {
    throw new Error("Unauthorized");
  }

  const whereCondition: any = { companyId };
  if (departmentId && departmentId !== "all") {
    whereCondition.departmentId = departmentId;
  }

  // Parallel queries for better performance
  const [
    headcount,
    managers,
    newStartersThisMonth,
    myPendingApprovals,
    allPendingApprovals,
  ] = await Promise.all([
    // Total active employees
    prisma.employee.count({
      where: { ...whereCondition, isActive: true },
    }),

    // Count of managers
    prisma.user.count({
      where: {
        companyId,
        role: "MANAGER",
        Employee: { isActive: true },
      },
    }),

    // New starters this month
    prisma.employee.count({
      where: {
        ...whereCondition,
        isActive: true,
        startDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),

    // My pending approvals - simplified count
    prisma.leaveRequest.count({
      where: {
        companyId,
        approvalStatus: "PENDING",
      },
    }),

    // All pending approvals (for admins)
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN"
      ? prisma.leaveRequest.count({
          where: {
            companyId,
            approvalStatus: "PENDING",
          },
        })
      : null,
  ]);

  return {
    headcount,
    managers,
    newStartersThisMonth,
    pendingApprovals: {
      my: myPendingApprovals,
      all: allPendingApprovals,
    },
    canViewAllApprovals: session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN",
  };
}

/**
 * Fetch "Who's Off" data for the calendar widget
 * Shows employees on leave in the next 7 days
 */
export async function getWhosOffData(companyId: string, departmentId?: string) {
  const session = await auth();
  
  if (!session?.user?.companyId || session.user.companyId !== companyId) {
    throw new Error("Unauthorized");
  }

  const today = new Date();
  const weekAhead = new Date();
  weekAhead.setDate(today.getDate() + 7);

  const whereCondition: any = {
    companyId,
    approvalStatus: "APPROVED",
    OR: [
      { startDate: { lte: weekAhead, gte: today } },
      { endDate: { gte: today, lte: weekAhead } },
      { AND: [{ startDate: { lte: today } }, { endDate: { gte: weekAhead } }] },
    ],
  };

  if (departmentId && departmentId !== "all") {
    whereCondition.Employee = { departmentId };
  }

  const leaveRequests = await prisma.leaveRequest.findMany({
    where: whereCondition,
    include: {
      Employee: {
        include: {
          User: {
            select: {
              firstName: true,
              lastName: true,
              profileImageUrl: true,
            },
          },
          Department: {
            select: { name: true },
          },
        },
      },
      EventCategory: {
        select: { name: true },
      },
    },
    orderBy: { startDate: "asc" },
    take: 50, // Limit to prevent performance issues
  });

  return leaveRequests.map((lr: any) => ({
    id: lr.id,
    employeeName: `${lr.Employee?.User?.firstName || ""} ${lr.Employee?.User?.lastName || ""}`.trim(),
    profileImageUrl: lr.Employee?.User?.profileImageUrl,
    department: lr.Employee?.Department?.name,
    startDate: lr.startDate.toISOString(),
    endDate: lr.endDate.toISOString(),
    type: lr.EventCategory?.name || "Leave",
    color: lr.EventCategory?.color || "#gray",
  }));
}

/**
 * Fetch departments for filtering
 */
export async function getDepartments(companyId: string) {
  const session = await auth();
  
  if (!session?.user?.companyId || session.user.companyId !== companyId) {
    throw new Error("Unauthorized");
  }

  return prisma.department.findMany({
    where: { companyId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Fetch new starters for the modal
 */
export async function getNewStarters(companyId: string) {
  const session = await auth();
  
  if (!session?.user?.companyId || session.user.companyId !== companyId) {
    throw new Error("Unauthorized");
  }

  const firstDayOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  const employees = await prisma.employee.findMany({
    where: {
      companyId,
      isActive: true,
      startDate: { gte: firstDayOfMonth },
    },
    include: {
      User: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          profileImageUrl: true,
        },
      },
      Department: {
        select: { name: true },
      },
      JobRole: {
        select: { name: true },
      },
    },
    orderBy: { startDate: "desc" },
  });

  return employees.map((emp: any) => ({
    id: emp.id,
    name: `${emp.User.firstName || ""} ${emp.User.lastName || ""}`.trim(),
    email: emp.User.email,
    profileImageUrl: emp.User.profileImageUrl,
    department: emp.Department?.name,
    jobRole: emp.JobRole?.name,
    startDate: emp.startDate?.toISOString() || new Date().toISOString(),
  }));
}
