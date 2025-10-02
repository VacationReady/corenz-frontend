/**
 * System Context Provider
 * Gives AI full visibility into system data for intelligent responses
 */

import { prisma } from "@/lib/prisma";

export interface SystemContext {
  employees: {
    total: number;
    active: number;
    byDepartment: Record<string, number>;
    withoutIRD: number;
    contractsExpiringSoon: number;
  };
  departments: Array<{ id: string; name: string; count: number }>;
  jobRoles: Array<{ id: string; name: string; count: number }>;
  leaveCategories: Array<{ id: string; name: string }>;
  forms: Array<{ id: string; name: string; slug: string; type: string }>;
  workflows: {
    total: number;
    active: number;
  };
  recentActivity: {
    newHires: number;
    pendingLeave: number;
    expiringDocuments: number;
  };
}

export async function getSystemContext(companyId: string): Promise<SystemContext> {
  try {
    const [
      totalEmployees,
      activeEmployees,
      employeesWithoutIRD,
      departments,
      jobRoles,
      leaveCategories,
      forms,
      workflows,
      contractsExpiringSoon,
      pendingLeaveRequests,
    ] = await Promise.all([
      // Total employees
      prisma.employee.count({ where: { companyId } }),
      
      // Active employees
      prisma.employee.count({ where: { companyId, isActive: true } }),
      
      // Employees without IRD
      prisma.employee.count({ where: { companyId, irdNumber: null } }),
      
      // Departments with counts
      prisma.department.findMany({
        where: { companyId },
        select: {
          id: true,
          name: true,
          _count: { select: { Employee: true } },
        },
      }),
      
      // Job roles with counts
      prisma.jobRole.findMany({
        where: { companyId },
        select: {
          id: true,
          name: true,
          _count: { select: { Employee: true } },
        },
      }),
      
      // Leave categories
      prisma.eventCategory.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true },
      }),
      
      // Forms
      prisma.form.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true, slug: true, formType: true },
      }),
      
      // Workflows
      prisma.automationRule.aggregate({
        where: { companyId },
        _count: { id: true },
      }),
      
      // Contracts expiring in 60 days
      prisma.employee.count({
        where: {
          companyId,
          isActive: true,
          contractEndDate: {
            lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
      }),
      
      // Pending leave requests
      prisma.leaveRequest.count({
        where: {
          Employee: { companyId },
          approvalStatus: "PENDING",
        },
      }),
    ]);

    const activeWorkflows = await prisma.automationRule.count({
      where: { companyId, isActive: true },
    });

    // Group employees by department
    const byDepartment: Record<string, number> = {};
    departments.forEach((dept) => {
      byDepartment[dept.name] = dept._count.Employee;
    });

    return {
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        byDepartment,
        withoutIRD: employeesWithoutIRD,
        contractsExpiringSoon,
      },
      departments: departments.map((d) => ({
        id: d.id,
        name: d.name,
        count: d._count.Employee,
      })),
      jobRoles: jobRoles.map((r) => ({
        id: r.id,
        name: r.name,
        count: r._count.Employee,
      })),
      leaveCategories: leaveCategories.map((c) => ({
        id: c.id,
        name: c.name,
      })),
      forms: forms.map((f) => ({
        id: f.id,
        name: f.name,
        slug: f.slug,
        type: f.formType,
      })),
      workflows: {
        total: workflows._count.id,
        active: activeWorkflows,
      },
      recentActivity: {
        newHires: await getNewHiresCount(companyId),
        pendingLeave: pendingLeaveRequests,
        expiringDocuments: await getExpiringDocumentsCount(companyId),
      },
    };
  } catch (error) {
    console.error("[System Context Error]", error);
    throw error;
  }
}

async function getNewHiresCount(companyId: string): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return prisma.employee.count({
    where: {
      companyId,
      isActive: true,
      startDate: { gte: thirtyDaysAgo },
    },
  });
}

async function getExpiringDocumentsCount(companyId: string): Promise<number> {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  return prisma.document.count({
    where: {
      Employee: { companyId },
      expiryDate: {
        lte: thirtyDaysFromNow,
        gte: new Date(),
      },
    },
  });
}

// Find employee by name (fuzzy match)
export async function findEmployeeByName(
  name: string,
  companyId: string
): Promise<Array<{ id: string; name: string; email: string; department: string }>> {
  const employees = await prisma.employee.findMany({
    where: {
      companyId,
      isActive: true,
      User: {
        OR: [
          { firstName: { contains: name, mode: "insensitive" } },
          { lastName: { contains: name, mode: "insensitive" } },
          { name: { contains: name, mode: "insensitive" } },
        ],
      },
    },
    include: {
      User: { select: { firstName: true, lastName: true, name: true, email: true } },
      Department: { select: { name: true } },
    },
    take: 10,
  });

  return employees.map((emp) => ({
    id: emp.id,
    name: emp.User.name || `${emp.User.firstName || ''} ${emp.User.lastName || ''}`.trim(),
    email: emp.User.email || "",
    department: emp.Department?.name || "No department",
  }));
}

// Build AI context string
export function buildAIContextString(context: SystemContext): string {
  return `
SYSTEM OVERVIEW:
- Total Employees: ${context.employees.total} (${context.employees.active} active)
- Departments: ${context.departments.length}
- Job Roles: ${context.jobRoles.length}
- Active Workflows: ${context.workflows.active}

KEY METRICS:
- Employees without IRD: ${context.employees.withoutIRD}
- Contracts expiring soon: ${context.employees.contractsExpiringSoon}
- Pending leave requests: ${context.recentActivity.pendingLeave}
- Expiring documents: ${context.recentActivity.expiringDocuments}
- New hires (last 30 days): ${context.recentActivity.newHires}

DEPARTMENTS: ${context.departments.map(d => `${d.name} (${d.count})`).join(", ")}

AVAILABLE FORMS: ${context.forms.map(f => f.name).join(", ")}

LEAVE TYPES: ${context.leaveCategories.map(c => c.name).join(", ")}
`;
}

