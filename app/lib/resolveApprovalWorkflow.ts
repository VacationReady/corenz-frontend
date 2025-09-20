import { prisma } from "@/lib/prisma";
import type { ApprovalScopeType, Prisma } from "@prisma/client";

type MinimalEmployee = {
  id: string;
  departmentId: string | null;
  jobRoleId: string | null;
  companyId: string;
};

export async function resolveApprovalWorkflow({
  companyId,
  employee,
  eventCategoryId,
}: {
  companyId: string;
  employee: MinimalEmployee;
  eventCategoryId: string;
}) {
  const workflows = await prisma.approvalWorkflow.findMany({
    where: {
      companyId,
      eventCategoryId,
      isActive: true,
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    include: {
      stages: {
        orderBy: { order: "asc" },
        include: {
          approvers: {
            orderBy: { order: "asc" },
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      EventCategory: { select: { id: true, name: true } },
    },
  });

  function matchesScope(wf: {
    scopeType: ApprovalScopeType;
    departmentIds: string[];
    jobRoleIds: string[];
    employeeIds: string[];
  }) {
    switch (wf.scopeType) {
      case "COMPANY":
        return true;
      case "DEPARTMENT":
        return !!employee.departmentId && wf.departmentIds.includes(employee.departmentId);
      case "JOB_ROLE":
        return !!employee.jobRoleId && wf.jobRoleIds.includes(employee.jobRoleId);
      case "EMPLOYEE":
        return wf.employeeIds.includes(employee.id);
      default:
        return false;
    }
  }

  const matched = workflows.find((wf) => matchesScope(wf));
  if (!matched) return null;

  return matched;
}


