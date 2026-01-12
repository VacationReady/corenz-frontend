import dayjs from "dayjs";
import { prisma } from "@/lib/prisma";

type SortOrder = "asc" | "desc";

function isConditionObject(value: any): value is { operator: string; value?: any; value2?: any } {
  return !!value && typeof value === "object" && typeof value.operator === "string";
}

function toPrismaStringFilter(raw: any) {
  if (!isConditionObject(raw)) {
    return raw;
  }

  const v = raw.value;
  switch (raw.operator) {
    case "equals":
      return v;
    case "not_equals":
      return { not: v };
    case "in":
      return Array.isArray(v) ? { in: v } : v;
    case "not_in":
      return Array.isArray(v) ? { notIn: v } : { not: v };
    case "contains":
      return { contains: String(v ?? ""), mode: "insensitive" };
    case "not_contains":
      return { not: { contains: String(v ?? ""), mode: "insensitive" } };
    case "starts_with":
      return { startsWith: String(v ?? ""), mode: "insensitive" };
    case "ends_with":
      return { endsWith: String(v ?? ""), mode: "insensitive" };
    default:
      return v;
  }
}

function toPrismaIdFilter(raw: any) {
  if (!isConditionObject(raw)) {
    return raw;
  }

  const v = raw.value;
  switch (raw.operator) {
    case "equals":
      return v;
    case "not_equals":
      return { not: v };
    case "in":
      return Array.isArray(v) ? { in: v } : v;
    case "not_in":
      return Array.isArray(v) ? { notIn: v } : { not: v };
    default:
      return v;
  }
}

function toBooleanWhere(raw: any): boolean | { not: boolean } | undefined {
  if (raw === undefined) return undefined;
  if (!isConditionObject(raw)) return Boolean(raw);
  if (raw.operator === "equals") return Boolean(raw.value);
  if (raw.operator === "not_equals") return { not: Boolean(raw.value) };
  return Boolean(raw.value);
}

function matchesNumberCondition(value: number, raw: any): boolean {
  if (!isConditionObject(raw)) {
    const threshold = Number(raw);
    if (Number.isNaN(threshold)) return true;
    return value <= threshold;
  }

  const v1 = Number(raw.value);
  const v2 = Number(raw.value2);
  switch (raw.operator) {
    case "equals":
      return !Number.isNaN(v1) ? value === v1 : true;
    case "not_equals":
      return !Number.isNaN(v1) ? value !== v1 : true;
    case "less_than":
      return !Number.isNaN(v1) ? value < v1 : true;
    case "less_than_equal":
      return !Number.isNaN(v1) ? value <= v1 : true;
    case "greater_than":
      return !Number.isNaN(v1) ? value > v1 : true;
    case "greater_than_equal":
      return !Number.isNaN(v1) ? value >= v1 : true;
    case "between":
      if (Number.isNaN(v1) || Number.isNaN(v2)) return true;
      return value >= Math.min(v1, v2) && value <= Math.max(v1, v2);
    default:
      return true;
  }
}

type ReportQueryResult = {
  data: any[];
  total: number;
};

type ReportQueryFn = (
  filters: Record<string, any>,
  pagination: Record<string, any>,
  context: { companyId: string }
) => Promise<any[] | ReportQueryResult>;

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
            ...(filters.status && { approvalStatus: toPrismaStringFilter(filters.status) }),
            ...(filters.employeeId && { employeeId: toPrismaIdFilter(filters.employeeId) }),
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
    allowedFilters: ["departmentId", "jobRoleId", "eventCategoryId", "remainingLT", "isActive"],
    allowedSort: ["_computed.remainingEntitlement", "Employee.User.lastName"],
    query: async (filters, pagination, context) => {
      const { page, limit, skip, sortBy, sortOrder } = normalizePagination(pagination);
      
      // Build the Employee filter only if there are actual conditions
      const employeeConditions: Record<string, any> = {};
      if (filters.departmentId) employeeConditions.departmentId = toPrismaIdFilter(filters.departmentId);
      if (filters.departmentName) {
        employeeConditions.Department = {
          name: toPrismaStringFilter(filters.departmentName),
        };
      }
      if (filters.jobRoleId) employeeConditions.jobRoleId = toPrismaIdFilter(filters.jobRoleId);
      if (filters.jobRoleName) {
        employeeConditions.JobRole = {
          name: toPrismaStringFilter(filters.jobRoleName),
        };
      }
      // Default to showing active employees unless explicitly set
      if (filters.isActive === undefined) {
        employeeConditions.isActive = true;
      } else {
        const isActiveWhere = toBooleanWhere(filters.isActive);
        if (isActiveWhere !== undefined) employeeConditions.isActive = isActiveWhere;
      }

      const andConditions: Record<string, any>[] = [
        {
          EventCategory: {
            name: { in: ["Annual Leave", "Annual", "Holiday", "Vacation"] },
          },
        },
      ];
      if (filters.eventCategoryName) {
        andConditions.push({
          EventCategory: {
            name: toPrismaStringFilter(filters.eventCategoryName),
          },
        });
      }
      
      const where: Record<string, any> = {
        companyId: context.companyId,
        // Only filter on Employee if we have conditions to apply
        ...(Object.keys(employeeConditions).length > 0 && { Employee: employeeConditions }),
        ...(filters.eventCategoryId && { eventCategoryId: toPrismaIdFilter(filters.eventCategoryId) }),
        ...(andConditions.length > 0 && { AND: andConditions }),
      };

      // Get total count first (before pagination)
      const totalCount = await prisma.leaveEntitlement.count({ where });

      const entitlements = await prisma.leaveEntitlement.findMany({
        where,
        include: {
          Employee: { include: { User: true, Department: true, JobRole: true } },
          EventCategory: true,
        },
        take: limit,
        skip,
        // Only allow concrete fields for Prisma-level sorting; computed handled below
        orderBy:
          sortBy && sortBy !== "_computed.remainingEntitlement"
            ? buildSort(sortBy, sortOrder)
            : { updatedAt: "desc" },
      });

      // Helper to round to 2 decimal places to avoid floating point precision issues
      const round2 = (n: number | null | undefined) => {
        if (n === null || n === undefined) return 0;
        return Math.round(n * 100) / 100;
      };

      // Map to a clean, serializable shape with a stable computed field name
      let rows = entitlements.map((record) => {
        const totalDays = round2(record.totalDays);
        const usedDays = round2(record.usedDays);
        const carryoverDays = round2(record.carryoverDays);
        // Note: daysAllocated is NOT added here because it's already included in totalDays
        // (see csv-import and other-entitlements routes where daysAllocated = totalDays)
        const total = totalDays + carryoverDays;
        const remainingEntitlement = round2(total - usedDays);
        const jobRoleName = record.Employee?.JobRole?.name ?? null;
        const departmentName = record.Employee?.Department?.name ?? null;
        return {
          id: record.id,
          employeeId: record.employeeId,
          companyId: record.companyId,
          LeaveEntitlement: {
            totalDays,
            usedDays,
            carryoverDays,
          },
          Employee: record.Employee
            ? {
                id: record.Employee.id,
                isActive: record.Employee.isActive,
                Department: record.Employee.Department
                  ? { name: record.Employee.Department.name }
                  : null,
                JobRole: record.Employee.JobRole
                  ? { name: record.Employee.JobRole.name }
                  : null,
                User: record.Employee.User
                  ? {
                      firstName: record.Employee.User.firstName,
                      lastName: record.Employee.User.lastName,
                      email: record.Employee.User.email,
                    }
                  : null,
              }
            : null,
          EventCategory: record.EventCategory
            ? { id: record.EventCategory.id, name: record.EventCategory.name }
            : null,
          _computed: { remainingEntitlement, jobRoleName, departmentName },
        };
      });

      // Optional threshold filter on remaining entitlement
      if (filters.remainingLT !== undefined) {
        rows = rows.filter((row) =>
          matchesNumberCondition(row._computed.remainingEntitlement, filters.remainingLT),
        );
      }

      // Apply client-requested sort for computed field
      if (sortBy === "_computed.remainingEntitlement") {
        rows.sort((a, b) => {
          const diff = a._computed.remainingEntitlement - b._computed.remainingEntitlement;
          return sortOrder === "desc" ? diff * -1 : diff;
        });
      }

      return { data: rows, total: totalCount };
    },
  },
  /**
   * NZ Annual Leave Compliance Report
   * 
   * Distinguishes between entitled leave (from LeaveEntitlement.usedDays) and 
   * leave in advance (from Employee.leaveInAdvanceUsed).
   * 
   * NZ Holidays Act 2003 Compliance:
   * - Employees are NOT entitled to annual leave until 12 months of continuous employment
   * - Leave taken before 12 months is "leave in advance" (tracked separately)
   * - This report shows both entitled and advance leave for compliance reporting
   * 
   * **Validates: Requirements 7.4**
   */
  nzAnnualLeaveCompliance: {
    name: "NZ Annual Leave Compliance",
    description: "Annual leave balances with entitled vs advance leave distinction (NZ Holidays Act 2003)",
    allowedFilters: ["departmentId", "jobRoleId", "isActive", "leaveStatus"],
    allowedSort: ["_computed.remainingEntitlement", "_computed.leaveInAdvanceUsed", "Employee.User.lastName"],
    query: async (filters, pagination, context) => {
      const { page, limit, skip, sortBy, sortOrder } = normalizePagination(pagination);
      
      // Build the Employee filter
      const employeeConditions: Record<string, any> = {};
      if (filters.departmentId) employeeConditions.departmentId = toPrismaIdFilter(filters.departmentId);
      if (filters.departmentName) {
        employeeConditions.Department = {
          name: toPrismaStringFilter(filters.departmentName),
        };
      }
      if (filters.jobRoleId) employeeConditions.jobRoleId = toPrismaIdFilter(filters.jobRoleId);
      if (filters.jobRoleName) {
        employeeConditions.JobRole = {
          name: toPrismaStringFilter(filters.jobRoleName),
        };
      }
      // Default to showing active employees unless explicitly set
      if (filters.isActive === undefined) {
        employeeConditions.isActive = true;
      } else {
        const isActiveWhere = toBooleanWhere(filters.isActive);
        if (isActiveWhere !== undefined) employeeConditions.isActive = isActiveWhere;
      }
      // Exclude casual employees (they receive 8% holiday pay instead)
      employeeConditions.isCasualEmployee = false;

      const where: Record<string, any> = {
        companyId: context.companyId,
        ...employeeConditions,
      };

      // Get total count first (before pagination)
      const totalCount = await prisma.employee.count({ where });

      // Fetch employees with their leave entitlements and NZ compliance fields
      const employees = await prisma.employee.findMany({
        where,
        include: {
          User: { select: { firstName: true, lastName: true, email: true } },
          Department: { select: { id: true, name: true } },
          JobRole: { select: { id: true, name: true } },
          LeaveEntitlement: {
            where: {
              EventCategory: {
                name: { in: ["Annual Leave", "Annual", "Holiday", "Vacation"] },
              },
            },
            include: {
              EventCategory: { select: { id: true, name: true } },
            },
          },
        },
        take: limit,
        skip,
        orderBy: sortBy && !sortBy.startsWith("_computed.")
          ? buildSort(sortBy, sortOrder)
          : [{ User: { lastName: "asc" } }, { User: { firstName: "asc" } }],
      });

      // Helper to round to 2 decimal places
      const round2 = (n: number | null | undefined) => {
        if (n === null || n === undefined) return 0;
        return Math.round(n * 100) / 100;
      };

      // Map to report format with entitled vs advance distinction
      let rows = employees.map((emp) => {
        const annualLeaveEntitlement = emp.LeaveEntitlement?.[0];
        const hasEntitlement = !!annualLeaveEntitlement;
        
        // Entitled leave (from LeaveEntitlement record - post-12-month employees)
        const entitledTotalDays = hasEntitlement ? round2(Number(annualLeaveEntitlement.totalDays)) : 0;
        const entitledUsedDays = hasEntitlement ? round2(Number(annualLeaveEntitlement.usedDays)) : 0;
        const entitledCarryoverDays = hasEntitlement ? round2(Number(annualLeaveEntitlement.carryoverDays)) : 0;
        const entitledRemaining = round2(entitledTotalDays + entitledCarryoverDays - entitledUsedDays);
        
        // Leave in advance (from Employee record - pre-12-month employees)
        const leaveInAdvanceUsed = round2(Number(emp.leaveInAdvanceUsed || 0));
        const futureEntitlement = round2(Number(emp.futureAnnualLeaveEntitlement || 0));
        const projectedBalance = round2(Math.max(0, futureEntitlement - leaveInAdvanceUsed));
        
        // Determine leave status
        let leaveStatus: "entitled" | "pre-entitlement" | "casual" = "entitled";
        if (emp.isCasualEmployee) {
          leaveStatus = "casual";
        } else if (!hasEntitlement && futureEntitlement > 0) {
          leaveStatus = "pre-entitlement";
        }
        
        // Calculate days until anniversary (for pre-entitlement employees)
        let daysUntilAnniversary: number | null = null;
        if (emp.annualLeaveEntitlementDate) {
          const today = new Date();
          const anniversaryDate = new Date(emp.annualLeaveEntitlementDate);
          daysUntilAnniversary = Math.ceil(
            (anniversaryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
        }

        return {
          employeeId: emp.id,
          Employee: {
            id: emp.id,
            isActive: emp.isActive,
            Department: emp.Department ? { id: emp.Department.id, name: emp.Department.name } : null,
            JobRole: emp.JobRole ? { id: emp.JobRole.id, name: emp.JobRole.name } : null,
            User: emp.User ? {
              firstName: emp.User.firstName,
              lastName: emp.User.lastName,
              email: emp.User.email,
            } : null,
          },
          // Entitled leave (post-12-month employees)
          EntitledLeave: hasEntitlement ? {
            totalDays: entitledTotalDays,
            usedDays: entitledUsedDays,
            carryoverDays: entitledCarryoverDays,
            remainingDays: entitledRemaining,
          } : null,
          // Leave in advance (pre-12-month employees)
          LeaveInAdvance: {
            usedDays: leaveInAdvanceUsed,
            futureEntitlement: futureEntitlement,
            projectedBalance: projectedBalance,
          },
          // NZ Compliance fields
          NZCompliance: {
            leaveStatus,
            annualLeaveEntitlementDate: emp.annualLeaveEntitlementDate?.toISOString() ?? null,
            daysUntilAnniversary,
            employmentStartDate: emp.employmentStartDate?.toISOString() ?? emp.startDate?.toISOString() ?? null,
            isCasualEmployee: emp.isCasualEmployee,
          },
          _computed: {
            remainingEntitlement: hasEntitlement ? entitledRemaining : projectedBalance,
            leaveInAdvanceUsed: leaveInAdvanceUsed,
            jobRoleName: emp.JobRole?.name ?? null,
            departmentName: emp.Department?.name ?? null,
            leaveStatus,
          },
        };
      });

      // Filter by leave status if specified
      if (filters.leaveStatus) {
        const statusFilter = toPrismaStringFilter(filters.leaveStatus);
        if (typeof statusFilter === "string") {
          rows = rows.filter((row) => row._computed.leaveStatus === statusFilter);
        }
      }

      // Apply client-requested sort for computed fields
      if (sortBy === "_computed.remainingEntitlement") {
        rows.sort((a, b) => {
          const diff = a._computed.remainingEntitlement - b._computed.remainingEntitlement;
          return sortOrder === "desc" ? diff * -1 : diff;
        });
      } else if (sortBy === "_computed.leaveInAdvanceUsed") {
        rows.sort((a, b) => {
          const diff = a._computed.leaveInAdvanceUsed - b._computed.leaveInAdvanceUsed;
          return sortOrder === "desc" ? diff * -1 : diff;
        });
      }

      return { data: rows, total: totalCount };
    },
  },
  sickLeaveUsageYTD: {
    name: "Sick Leave Usage YTD",
    description: "Total sick leave days taken per employee in the current calendar year",
    allowedFilters: ["departmentId", "jobRoleId"],
    allowedSort: ["sickLeaveTaken", "employeeLastName"],
    query: async (filters, pagination, context) => {
      const { page, limit, skip, sortBy, sortOrder } = normalizePagination(pagination);
      const startOfYear = dayjs().startOf("year").toDate();

      // Build Employee filter only when needed
      const employeeConditions: Record<string, any> = {};
      if (filters.departmentId) employeeConditions.departmentId = toPrismaIdFilter(filters.departmentId);
      if (filters.departmentName) {
        employeeConditions.Department = {
          name: toPrismaStringFilter(filters.departmentName),
        };
      }
      if (filters.jobRoleId) employeeConditions.jobRoleId = toPrismaIdFilter(filters.jobRoleId);
      if (filters.jobRoleName) {
        employeeConditions.JobRole = {
          name: toPrismaStringFilter(filters.jobRoleName),
        };
      }
      if (filters.isActive !== undefined) {
        const isActiveWhere = toBooleanWhere(filters.isActive);
        if (isActiveWhere !== undefined) employeeConditions.isActive = isActiveWhere;
      }

      const leave = await prisma.leaveRequest.findMany({
        where: {
          companyId: context.companyId,
          startDate: { gte: startOfYear },
          approvalStatus: "APPROVED",
          EventCategory: {
            name: { in: ["Sick", "Sick Leave", "Sick Leave (Paid)"] },
          },
          // Only add Employee filter if there are conditions
          ...(Object.keys(employeeConditions).length > 0 && { Employee: employeeConditions }),
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
            sickLeaveTaken: 0,
          };
        }
        totals[id].sickLeaveTaken += days;
      }

      const rows = Object.values(totals).sort((a: any, b: any) => {
        if (sortBy === "employeeLastName") {
          return sortOrder === "desc"
            ? b.lastName.localeCompare(a.lastName)
            : a.lastName.localeCompare(b.lastName);
        }
        return sortOrder === "desc"
          ? b.sickLeaveTaken - a.sickLeaveTaken
          : a.sickLeaveTaken - b.sickLeaveTaken;
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

