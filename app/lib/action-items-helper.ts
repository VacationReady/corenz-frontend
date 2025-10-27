import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const TIMESHEET_ACTION_ITEM_PREFIX = "timesheet-approval-";

const buildTimesheetActionItemId = (decisionId: string) => `${TIMESHEET_ACTION_ITEM_PREFIX}${decisionId}`;

export interface CreateActionItemParams {
  companyId: string;
  type: string;
  title: string;
  description?: string;
  assignedToId: string;
  relatedEmployeeId?: string;
  dueDate?: Date;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  metadata?: any;
}

interface UpsertTimesheetApprovalActionItemParams {
  companyId: string;
  assignedToId: string | null;
  relatedEmployeeId: string;
  timesheetId: string;
  decisionId: string;
  stageId: string;
  stageName?: string | null;
  periodStart: Date;
  periodEnd: Date;
  totalHours?: number | null;
  employeeName: string;
}

const formatDate = (date: Date) => date.toISOString().split("T")[0];

export async function upsertTimesheetApprovalActionItem({
  companyId,
  assignedToId,
  relatedEmployeeId,
  timesheetId,
  decisionId,
  stageId,
  stageName,
  periodStart,
  periodEnd,
  totalHours,
  employeeName,
}: UpsertTimesheetApprovalActionItemParams) {
  if (!assignedToId) return;

  const actionItemId = buildTimesheetActionItemId(decisionId);
  const periodLabel = `${formatDate(periodStart)} - ${formatDate(periodEnd)}`;

  const title = `Approve timesheet for ${employeeName}`;
  const description = `Timesheet period ${periodLabel}${stageName ? ` • ${stageName}` : ""}`;

  const metadata = {
    timesheetId,
    decisionId,
    stageId,
    stageName,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    totalHours: typeof totalHours === "number" ? totalHours : totalHours ? Number(totalHours) : undefined,
    label: periodLabel,
  };

  const dueDate = periodEnd instanceof Date ? periodEnd : new Date(periodEnd);

  await prisma.actionItem.upsert({
    where: { id: actionItemId },
    create: {
      id: actionItemId,
      companyId,
      type: "TIMESHEET_APPROVAL",
      title,
      description,
      assignedToId,
      relatedEmployeeId,
      status: "PENDING",
      priority: "HIGH",
      dueDate,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    update: {
      title,
      description,
      assignedToId,
      relatedEmployeeId,
      status: "PENDING",
      priority: "HIGH",
      dueDate,
      metadata,
      completedAt: null,
      updatedAt: new Date(),
    },
  });
}

export async function completeTimesheetApprovalActionItem(decisionId: string) {
  const actionItemId = buildTimesheetActionItemId(decisionId);
  try {
    await prisma.actionItem.update({
      where: { id: actionItemId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    // Ignore if the action item was not found
  }
}

export async function cancelTimesheetApprovalActionItem(decisionId: string) {
  const actionItemId = buildTimesheetActionItemId(decisionId);
  try {
    await prisma.actionItem.update({
      where: { id: actionItemId },
      data: {
        status: "CANCELLED",
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    // Ignore if the action item was not found
  }
}

export async function cancelTimesheetApprovalActionItems(decisionIds: string[]) {
  if (decisionIds.length === 0) return;
  await prisma.actionItem.updateMany({
    where: {
      id: {
        in: decisionIds.map((id) => buildTimesheetActionItemId(id)),
      },
    },
    data: {
      status: "CANCELLED",
      updatedAt: new Date(),
    },
  });
}

export async function cancelPendingTimesheetApprovalActionItems(timesheetId: string) {
  await prisma.actionItem.updateMany({
    where: {
      status: "PENDING",
      metadata: {
        path: ["timesheetId"],
        equals: timesheetId,
      },
    },
    data: {
      status: "CANCELLED",
      updatedAt: new Date(),
    },
  });
}

export async function resolveActionItemAssigneeUserId(approverId: string) {
  if (!approverId) return null;

  const approverEmployee = await prisma.employee.findFirst({
    where: {
      OR: [{ id: approverId }, { userId: approverId }],
    },
    select: {
      userId: true,
    },
  });

  if (approverEmployee?.userId) {
    return approverEmployee.userId;
  }

  const user = await prisma.user.findUnique({
    where: { id: approverId },
    select: { id: true },
  });

  return user?.id ?? null;
}

/**
 * Create a single action item
 */
export async function createActionItem(params: CreateActionItemParams) {
  const {
    companyId,
    type,
    title,
    description,
    assignedToId,
    relatedEmployeeId,
    dueDate,
    priority = "MEDIUM",
    metadata = {},
  } = params;

  return await prisma.actionItem.create({
    data: {
      id: crypto.randomUUID(),
      companyId,
      type,
      title,
      description,
      assignedToId,
      relatedEmployeeId,
      dueDate,
      priority,
      status: "PENDING",
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Create action items in bulk
 */
export async function createActionItemsBulk(items: CreateActionItemParams[]) {
  const actionItems = items.map((item) => ({
    id: crypto.randomUUID(),
    companyId: item.companyId,
    type: item.type,
    title: item.title,
    description: item.description,
    assignedToId: item.assignedToId,
    relatedEmployeeId: item.relatedEmployeeId,
    dueDate: item.dueDate,
    priority: item.priority || "MEDIUM",
    status: "PENDING",
    metadata: item.metadata || {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  return await prisma.actionItem.createMany({
    data: actionItems,
  });
}

/**
 * Mark action item as completed
 */
export async function completeActionItem(actionItemId: string) {
  return await prisma.actionItem.update({
    where: { id: actionItemId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Get employees in scope based on audience filters
 */
async function getEmployeesInScope(companyId: string, audienceFilters: any) {
  const where: any = {
    companyId,
    status: "ACTIVE",
  };

  // Apply audience filters
  if (audienceFilters) {
    const conditions: any[] = [];

    if (audienceFilters.departments && audienceFilters.departments.length > 0) {
      conditions.push({
        departmentId: { in: audienceFilters.departments },
      });
    }

    if (audienceFilters.locations && audienceFilters.locations.length > 0) {
      conditions.push({
        locationId: { in: audienceFilters.locations },
      });
    }

    if (audienceFilters.jobRoles && audienceFilters.jobRoles.length > 0) {
      conditions.push({
        jobRole: { in: audienceFilters.jobRoles },
      });
    }

    // If any filters specified, apply OR logic
    if (conditions.length > 0) {
      where.OR = conditions;
    }
  }

  const employees = await prisma.employee.findMany({
    where,
    select: {
      id: true,
      userId: true,
      User: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          managerId: true,
        },
      },
      Department: {
        select: {
          name: true,
        },
      },
    },
  });

  return employees.map((emp: any) => ({
    id: emp.id,
    userId: emp.userId,
    managerId: emp.User?.managerId,
    name: `${emp.User?.firstName || ''} ${emp.User?.lastName || ''}`.trim(),
    email: emp.User?.email,
    department: emp.Department?.name,
  }));
}

/**
 * Get reviewer user ID based on reviewer role
 */
function getReviewerUserId(employee: any, reviewerRole: string): string | null {
  switch (reviewerRole) {
    case "SELF":
      return employee.userId;
    case "MANAGER":
      return employee.managerId;
    case "SKIP_LEVEL":
      // Would need to get manager's manager
      // For now, return null
      return null;
    case "HR":
      // Would need to get HR manager for company
      // For now, return null
      return null;
    default:
      return null;
  }
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Create action items for a performance review cycle
 */
export async function createReviewCycleActionItems(
  cycleId: string,
  companyId: string
) {
  // Get the review cycle with template
  const cycle = await prisma.performanceReviewCycle.findUnique({
    where: { id: cycleId },
    include: {
      Template: true,
    },
  });

  if (!cycle || !cycle.Template) {
    throw new Error("Review cycle or template not found");
  }

  const template = cycle.Template;
  const audienceFilters = template.audienceFilters as any;
  const reviewerAssignments = template.reviewerAssignments as any;

  if (!reviewerAssignments || !Array.isArray(reviewerAssignments)) {
    throw new Error("No reviewer assignments configured");
  }

  // Get employees in scope
  const employees = await getEmployeesInScope(companyId, audienceFilters);

  if (employees.length === 0) {
    return { success: true, created: 0, message: "No employees in scope" };
  }

  const actionItems: CreateActionItemParams[] = [];

  // For each employee, create action items for each reviewer role
  for (const employee of employees) {
    for (const reviewer of reviewerAssignments) {
      const reviewerUserId = getReviewerUserId(employee, reviewer.role);

      // Skip if we can't determine reviewer (e.g., no manager assigned)
      if (!reviewerUserId) {
        console.warn(`Skipping ${reviewer.role} review for ${employee.name} - no reviewer found`);
        continue;
      }

      // Skip peer and direct report reviews for now (require manual selection)
      if (reviewer.role === "PEER" || reviewer.role === "DIRECT_REPORT") {
        continue;
      }

      const dueDate = addDays(cycle.startDate, reviewer.dueOffsetDays || 0);
      const now = new Date();
      const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Set priority based on due date and if required
      let priority: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
      if (reviewer.isRequired) {
        priority = daysUntilDue < 3 ? "HIGH" : "MEDIUM";
      } else {
        priority = "LOW";
      }

      actionItems.push({
        companyId,
        type: `PERFORMANCE_${reviewer.role}_REVIEW`,
        title:
          reviewer.role === "SELF"
            ? `Complete self-review: ${cycle.name}`
            : `Complete ${reviewer.role.toLowerCase().replace('_', ' ')} review for ${employee.name}`,
        description: template.description || `Performance review for ${cycle.name}`,
        assignedToId: reviewerUserId,
        relatedEmployeeId: employee.id,
        dueDate,
        priority,
        metadata: {
          cycleId: cycle.id,
          cycleName: cycle.name,
          templateId: template.id,
          reviewerRole: reviewer.role,
          isRequired: reviewer.isRequired,
          employeeName: employee.name,
          employeeEmail: employee.email,
        },
      });
    }
  }

  // Bulk create action items
  if (actionItems.length > 0) {
    await createActionItemsBulk(actionItems);
  }

  return {
    success: true,
    created: actionItems.length,
    employeesInScope: employees.length,
    message: `Created ${actionItems.length} action items for ${employees.length} employees`,
  };
}

/**
 * Create action items for a leave request approval
 */
export async function createLeaveApprovalActionItem(
  leaveRequestId: string,
  employeeId: string,
  managerId: string,
  companyId: string,
  leaveDetails: {
    startDate: Date;
    endDate: Date;
    typeName: string;
  }
) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      User: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  const employeeName = `${employee.User?.firstName || ''} ${employee.User?.lastName || ''}`.trim();

  return await createActionItem({
    companyId,
    type: "LEAVE_APPROVAL",
    title: `Approve ${leaveDetails.typeName} request for ${employeeName}`,
    description: `${leaveDetails.typeName} from ${leaveDetails.startDate.toLocaleDateString()} to ${leaveDetails.endDate.toLocaleDateString()}`,
    assignedToId: managerId,
    relatedEmployeeId: employeeId,
    dueDate: addDays(new Date(), 3), // 3 days to approve
    priority: "MEDIUM",
    metadata: {
      leaveRequestId,
      startDate: leaveDetails.startDate,
      endDate: leaveDetails.endDate,
      typeName: leaveDetails.typeName,
    },
  });
}

/**
 * Create action items for offboarding tasks
 */
export async function createOffboardingActionItems(
  offboardingId: string,
  employeeId: string,
  companyId: string,
  lastWorkingDay: Date
) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      User: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  const employeeName = `${employee.User?.firstName || ''} ${employee.User?.lastName || ''}`.trim();

  const offboardingTasks = [
    {
      type: "EXIT_INTERVIEW",
      title: `Schedule exit interview with ${employeeName}`,
      assignedTo: null, // Would need HR manager ID
      dueOffset: -7, // 7 days before last working day
      priority: "HIGH" as const,
    },
    {
      type: "EQUIPMENT_RETURN",
      title: `Return company equipment`,
      assignedTo: employee.User?.id,
      dueOffset: 0, // On last working day
      priority: "HIGH" as const,
    },
    {
      type: "ACCESS_REVOCATION",
      title: `Revoke system access for ${employeeName}`,
      assignedTo: null, // Would need IT admin ID
      dueOffset: 1, // 1 day after last working day
      priority: "HIGH" as const,
    },
  ];

  const actionItems: CreateActionItemParams[] = [];

  for (const task of offboardingTasks) {
    if (!task.assignedTo) {
      continue; // Skip tasks without assignee for now
    }

    actionItems.push({
      companyId,
      type: task.type,
      title: task.title,
      assignedToId: task.assignedTo,
      relatedEmployeeId: employeeId,
      dueDate: addDays(lastWorkingDay, task.dueOffset),
      priority: task.priority,
      metadata: {
        offboardingId,
        lastWorkingDay,
      },
    });
  }

  if (actionItems.length > 0) {
    await createActionItemsBulk(actionItems);
  }

  return {
    success: true,
    created: actionItems.length,
  };
}
