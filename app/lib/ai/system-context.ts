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
    running: number;
    failed24h: number;
    lastRunSummary?: string;
    recentExecutions: Array<{
      id: string;
      name: string;
      status: string;
      triggeredAt: string;
      completedAt?: string | null;
      durationMs?: number | null;
      errorMessage?: string | null;
    }>;
  };
  recentActivity: {
    newHires: number;
    pendingLeave: number;
    expiringDocuments: number;
  };
  csvImport: {
    availableFields: string[];
    requiredFields: string[];
    optionalFields: string[];
    supportedDataTypes: string[];
    lastImportDate?: string;
    totalImports: number;
    recentImports: Array<{
      id: string;
      fileName: string;
      recordCount: number;
      successCount: number;
      errorCount: number;
      importedAt: string;
    }>;
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
      runningExecutions,
      failedExecutions24h,
      recentExecutionsRaw,
      csvImportEmployees,
      recentCsvImports,
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

      prisma.automationExecution.count({
        where: { companyId, status: "RUNNING" },
      }),

      prisma.automationExecution.count({
        where: {
          companyId,
          status: "FAILED",
          triggeredAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),

      prisma.automationExecution.findMany({
        where: { companyId },
        orderBy: { triggeredAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          triggeredAt: true,
          completedAt: true,
          durationMs: true,
          errorMessage: true,
          triggerSummary: true,
          AutomationRule: { select: { name: true } },
        },
      }),

      // CSV Import data - count total imports (using EmployeeAuditLog)
      prisma.employeeAuditLog.findMany({
        where: {
          companyId,
          section: "CSV_IMPORT",
        },
        select: {
          employeeId: true,
        },
        distinct: "employeeId",
      }),

      // Recent CSV imports (using EmployeeAuditLog)
      prisma.employeeAuditLog.findMany({
        where: {
          companyId,
          section: "CSV_IMPORT",
        },
        orderBy: { changedAt: "desc" },
        take: 5,
        select: {
          id: true,
          changedAt: true,
          newValue: true,
          employeeId: true,
        },
      }),
    ]);

    const activeWorkflows = await prisma.automationRule.count({
      where: { companyId, isActive: true },
    });

    const recentExecutions = recentExecutionsRaw.map((exec) => ({
      id: exec.id,
      name: exec.AutomationRule?.name || "Unnamed Workflow",
      status: exec.status,
      triggeredAt: exec.triggeredAt.toISOString(),
      completedAt: exec.completedAt ? exec.completedAt.toISOString() : null,
      durationMs: exec.durationMs,
      errorMessage: exec.errorMessage,
    }));

    const lastRun = recentExecutions.find((exec) => exec.completedAt);
    const lastRunSummary = lastRun
      ? `${lastRun.name} ${lastRun.status.toLowerCase()} at ${new Date(lastRun.completedAt || lastRun.triggeredAt).toLocaleString("en-NZ")}`
      : undefined;

    // Process CSV import data
    const processedCsvImports = recentCsvImports.map((importLog) => {
      return {
        id: importLog.id,
        fileName: "Employee CSV Import",
        recordCount: 1, // Each log entry represents one employee
        successCount: 1,
        errorCount: 0,
        importedAt: importLog.changedAt.toISOString(),
      };
    });

    const lastCsvImport = processedCsvImports[0];
    const lastImportDate = lastCsvImport ? new Date(lastCsvImport.importedAt).toLocaleDateString("en-NZ") : undefined;

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
        running: runningExecutions,
        failed24h: failedExecutions24h,
        lastRunSummary,
        recentExecutions,
      },
      recentActivity: {
        newHires: await getNewHiresCount(companyId),
        pendingLeave: pendingLeaveRequests,
        expiringDocuments: await getExpiringDocumentsCount(companyId),
      },
      csvImport: {
        availableFields: [
          "firstName", "lastName", "email", "phoneNumber", "dateOfBirth", "gender",
          "street", "address", "city", "postcode", "postalCode", "country", "nationalId", 
          "pronouns", "residencyStatus", "holidayTotalBalance", "holidayCarryover", 
          "holidayCurrentBalance", "holidayYear", "departmentName", "jobRoleName", 
          "jobTitle", "employmentType", "contractType", "siteLocation", "startDate", 
          "contractEndDate", "workingPatternName", "lineManagerName", "salaryAmount",
          "salary", "hourlyRate", "hourly", "emergencyContactName",
          "emergencyContactRelationship", "emergencyContactPhone", "emergencyContactEmail",
          "bankAccountNumber", "irdNumber", "taxCode", "kiwiSaverEnrolled", 
          "kiwiSaverContribution", "driverLicenceType", "driverLicenceNumber", 
          "driverLicenceIssueDate", "driverLicenceExpiryDate", "trainingCourse", 
          "trainingProvider", "trainingDateCompleted", "trainingExpiryDate", 
          "employmentCheckType", "employmentCheckDocumentNumber", "employmentCheckIssueDate", 
          "employmentCheckExpiryDate"
        ],
        requiredFields: ["firstName", "lastName", "email"],
        optionalFields: [
          "phoneNumber", "dateOfBirth", "gender", "street", "address", "city", 
          "postcode", "postalCode", "country", "nationalId", "pronouns", 
          "residencyStatus", "holidayTotalBalance", "holidayCarryover", 
          "holidayCurrentBalance", "holidayYear", "departmentName", "jobRoleName", 
          "jobTitle", "employmentType", "contractType", "siteLocation", "startDate", 
          "contractEndDate", "workingPatternName", "lineManagerName", "salaryAmount",
          "salary", "hourlyRate", "hourly", "emergencyContactName",
          "emergencyContactRelationship", "emergencyContactPhone", "emergencyContactEmail",
          "bankAccountNumber", "irdNumber", "taxCode", "kiwiSaverEnrolled", 
          "kiwiSaverContribution", "driverLicenceType", "driverLicenceNumber", 
          "driverLicenceIssueDate", "driverLicenceExpiryDate", "trainingCourse", 
          "trainingProvider", "trainingDateCompleted", "trainingExpiryDate", 
          "employmentCheckType", "employmentCheckDocumentNumber", "employmentCheckIssueDate", 
          "employmentCheckExpiryDate"
        ],
        supportedDataTypes: ["text", "email", "date", "number", "boolean", "currency"],
        lastImportDate,
        totalImports: csvImportEmployees.length,
        recentImports: processedCsvImports,
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

  return prisma.employmentCheck.count({
    where: {
      Employee: { companyId },
      expiryDate: {
        lte: thirtyDaysFromNow,
        gte: new Date(),
      },
    },
  });
}

// Find employee by name (fuzzy match with fallback to similar names)
export async function findEmployeeByName(
  name: string,
  companyId: string
): Promise<Array<{ id: string; name: string; email: string; department: string; similarity?: string }>> {
  // Split name into parts for better matching
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : null;

  // First try: Exact or strong match
  let employees = await prisma.employee.findMany({
    where: {
      companyId,
      isActive: true,
      User: {
        OR: [
          { firstName: { contains: firstName, mode: "insensitive" } },
          { lastName: { contains: lastName || firstName, mode: "insensitive" } },
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

  // If no results, try broader search (first few characters)
  if (employees.length === 0 && firstName.length >= 3) {
    const prefix = firstName.substring(0, 3);
    employees = await prisma.employee.findMany({
      where: {
        companyId,
        isActive: true,
        User: {
          OR: [
            { firstName: { startsWith: prefix, mode: "insensitive" } },
            { lastName: { startsWith: prefix, mode: "insensitive" } },
          ],
        },
      },
      include: {
        User: { select: { firstName: true, lastName: true, name: true, email: true } },
        Department: { select: { name: true } },
      },
      take: 10,
    });
  }

  return employees.map((emp) => ({
    id: emp.id,
    name: emp.User.name || `${emp.User.firstName || ''} ${emp.User.lastName || ''}`.trim(),
    email: emp.User.email || "",
    department: emp.Department?.name || "No department",
  }));
}

// Build AI context string
export function buildAIContextString(context: SystemContext): string {
  const recentWorkflowLines = context.workflows.recentExecutions
    .map((exec) => {
      const when = new Date(exec.completedAt || exec.triggeredAt).toLocaleString("en-NZ");
      const outcome = exec.status.toLowerCase();
      return `  • ${exec.name}: ${outcome} @ ${when}${exec.errorMessage ? ` (error: ${exec.errorMessage})` : ""}`;
    })
    .join("\n");

  return `
SYSTEM OVERVIEW:
- Total Employees: ${context.employees.total} (${context.employees.active} active)
- Departments: ${context.departments.length}
- Job Roles: ${context.jobRoles.length}
- Active Workflows: ${context.workflows.active}
- Workflows Running Now: ${context.workflows.running}
- Workflow Failures (24h): ${context.workflows.failed24h}
- Last Workflow Run: ${context.workflows.lastRunSummary || "No executions yet"}

KEY METRICS:
- Employees without IRD: ${context.employees.withoutIRD}
- Contracts expiring soon: ${context.employees.contractsExpiringSoon}
- Pending leave requests: ${context.recentActivity.pendingLeave}
- Expiring documents: ${context.recentActivity.expiringDocuments}
- New hires (last 30 days): ${context.recentActivity.newHires}

RECENT WORKFLOW EXECUTIONS:
${recentWorkflowLines || "  • No workflow executions logged"}

DEPARTMENTS: ${context.departments.map(d => `${d.name} (${d.count})`).join(", ")}

AVAILABLE FORMS: ${context.forms.map(f => f.name).join(", ")}

LEAVE TYPES: ${context.leaveCategories.map(c => c.name).join(", ")}

CSV IMPORT CAPABILITIES:
- Total imports completed: ${context.csvImport.totalImports}
- Last import: ${context.csvImport.lastImportDate || "No imports yet"}
- Available fields: ${context.csvImport.availableFields.length} total
- Required fields: ${context.csvImport.requiredFields.join(", ")}
- Recent imports: ${context.csvImport.recentImports.length > 0 ? context.csvImport.recentImports.map(imp => `${imp.fileName} (${imp.successCount}/${imp.recordCount} records)`).join(", ") : "None"}
`;
}

