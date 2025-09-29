import dayjs from "dayjs";
import { prisma } from "@/lib/prisma";

type SortOrder = "asc" | "desc";

type ReportQueryFn = (
  filters: Record<string, any>,
  pagination: Record<string, any>,
  context: { companyId: string }
) => Promise<any>;

interface ReportDefinition {
  name: string;
  description: string;
  allowedFilters?: string[];
  allowedSort?: string[];
  query: ReportQueryFn;
}

function normalizePagination(input: Record<string, any>) {
  const page = Math.max(1, Number(input?.page) || 1);
  const limit = Math.min(500, Math.max(1, Number(input?.limit) || 50));
  const skip = (page - 1) * limit;
  const sortBy = typeof input?.sortBy === "string" && input.sortBy.length > 0 ? input.sortBy : null;
  const sortOrder: SortOrder = input?.sortOrder === "desc" ? "desc" : "asc";
  return { page, limit, skip, sortBy, sortOrder };
}

function buildSort(sortBy: string | null, sortOrder: SortOrder) {
  if (!sortBy) return undefined;
  return { [sortBy]: sortOrder } as Record<string, SortOrder>;
}

function enforceCompanyId(where: Record<string, any>, companyId: string) {
  return { ...where, companyId };
}

export const reportDefinitions: Record<string, ReportDefinition> = {
  leaveWithEmployee: {
    name: "Leave Requests with Employee Details",
    description: "All leave requests joined with employee user and department",
    allowedFilters: ["status", "employeeId"],
    allowedSort: ["startDate", "status"],
    query: async (filters, pagination, context) => {
      const { page, limit, skip, sortBy, sortOrder } = normalizePagination(pagination);
      const orderBy = buildSort(sortBy, sortOrder) ?? { createdAt: "desc" };
      return prisma.leaveRequest.findMany({
        where: enforceCompanyId(
          {
            ...(filters.status && { approvalStatus: filters.status }),
            ...(filters.employeeId && { employeeId: filters.employeeId }),
          },
          context.companyId,
        ),
        include: {
          Employee: {
            select: {
              User: { select: { firstName: true, lastName: true, email: true } },
              Department: { select: { name: true } },
            },
          },
          EventCategory: { select: { name: true } },
        },
        orderBy,
        take: limit,
        skip,
      });
    },
  },
  annualLeaveBalances: {
    name: "Annual Leave Balances",
    description: "Current leave balances by employee and category",
    allowedFilters: ["departmentId", "jobRoleId", "eventCategoryId", "remainingLT"],
    allowedSort: ["remaining", "Employee.User.lastName"],
    query: async (filters, pagination, context) => {
      const { page, limit, skip, sortBy, sortOrder } = normalizePagination(pagination);
      const where = enforceCompanyId(
        {
          ...(filters.eventCategoryId && { eventCategoryId: filters.eventCategoryId }),
          Employee: {
            ...(filters.departmentId && { departmentId: filters.departmentId }),
            ...(filters.jobRoleId && { jobRoleId: filters.jobRoleId }),
            ...(filters.isActive === false ? { isActive: false } : { isActive: true }),
            companyId: context.companyId,
          },
        },
        context.companyId,
      );

      const entitlements = await prisma.leaveEntitlement.findMany({
        where,
        include: {
          Employee: { include: { User: true, Department: true, JobRole: true } },
          EventCategory: true,
        },
        take: limit,
        skip,
        orderBy: buildSort(sortBy, sortOrder) ?? { updatedAt: "desc" },
      });

      const rows = entitlements
        .map((record) => {
          const total = (record.totalDays || 0) + (record.carryoverDays || 0) + (record.daysAllocated || 0);
          const remaining = total - (record.usedDays || 0);
          return {
            ...record,
            computed: { remaining },
          };
        })
        .filter((row) => {
          if (filters.remainingLT === undefined) return true;
          const threshold = Number(filters.remainingLT);
          if (Number.isNaN(threshold)) return true;
          return row.computed.remaining <= threshold;
        });

      if (sortBy === "remaining") {
        rows.sort((a, b) => {
          const diff = a.computed.remaining - b.computed.remaining;
          return sortOrder === "desc" ? diff * -1 : diff;
        });
      }

      return rows;
    },
  },
  sickLeaveUsageYTD: {
    name: "Sick Leave Usage YTD",
    description: "Total sick leave days taken per employee in the current calendar year",
    allowedFilters: ["departmentId", "jobRoleId"],
    allowedSort: ["days", "employeeLastName"],
    query: async (filters, pagination, context) => {
      const { page, limit, skip, sortBy, sortOrder } = normalizePagination(pagination);
      const startOfYear = dayjs().startOf("year").toDate();

      const leave = await prisma.leaveRequest.findMany({
        where: {
          companyId: context.companyId,
          startDate: { gte: startOfYear },
          approvalStatus: "APPROVED",
          EventCategory: {
            companyId: context.companyId,
            name: { in: ["Sick", "Sick Leave", "Sick Leave (Paid)"] },
          },
          Employee: {
            companyId: context.companyId,
            ...(filters.departmentId && { departmentId: filters.departmentId }),
            ...(filters.jobRoleId && { jobRoleId: filters.jobRoleId }),
          },
        },
        include: {
          Employee: { include: { User: true, Department: true, JobRole: true } },
        },
        orderBy: { startDate: "asc" },
      });

      const totals: Record<string, any> = {};
      for (const request of leave) {
        const id = request.employeeId;
        const days = dayjs(request.endDate).diff(request.startDate, "day") + 1;
        if (!totals[id]) {
          totals[id] = {
            employeeId: id,
            firstName: request.Employee?.User?.firstName || "",
            lastName: request.Employee?.User?.lastName || "",
            department: request.Employee?.Department?.name || null,
            jobRole: request.Employee?.JobRole?.name || null,
            days: 0,
          };
        }
        totals[id].days += days;
      }

      const rows = Object.values(totals).sort((a: any, b: any) => {
        if (sortBy === "employeeLastName") {
          return sortOrder === "desc"
            ? b.lastName.localeCompare(a.lastName)
            : a.lastName.localeCompare(b.lastName);
        }
        return sortOrder === "desc" ? b.days - a.days : a.days - b.days;
      });

      const sliceStart = skip;
      const sliceEnd = skip + limit;
      return rows.slice(sliceStart, sliceEnd);
    },
  },
  headcountByDepartment: {
    name: "Headcount by Department",
    description: "Active headcount totals by department",
    allowedFilters: [],
    allowedSort: ["headcount"],
    query: async (_filters, pagination, context) => {
      const { sortBy, sortOrder } = normalizePagination(pagination);
      const departments = await prisma.department.findMany({
        where: { companyId: context.companyId, active: true },
        select: {
          id: true,
          name: true,
          Employee: { where: { companyId: context.companyId }, select: { isActive: true } },
        },
      });

      const rows = departments.map((dept) => {
        const headcount = dept.Employee.length;
        const activeHeadcount = dept.Employee.filter((emp) => emp.isActive).length;
        return {
          departmentId: dept.id,
          departmentName: dept.name,
          headcount,
          activeHeadcount,
        };
      });

      rows.sort((a, b) => {
        if (sortBy === "headcount") {
          return sortOrder === "desc" ? b.headcount - a.headcount : a.headcount - b.headcount;
        }
        return a.departmentName.localeCompare(b.departmentName);
      });

      return rows;
    },
  },
};

