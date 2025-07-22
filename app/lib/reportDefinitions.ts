import { prisma } from "@/lib/prisma";

export const reportDefinitions = {
  leaveWithEmployee: {
    name: "Leave Requests with Employee Details",
    description: "All leave requests joined with employee name, email, and department",
    allowedFilters: ["status", "employeeId"],
    allowedSort: ["startDate", "status"],
    query: async (filters: any, pagination: any) => {
      return prisma.leaveRequest.findMany({
        where: {
          ...(filters.status && { status: filters.status }),
          ...(filters.employeeId && { employeeId: filters.employeeId }),
        },
        include: {
          employee: {
            select: {
              name: true,
              email: true,
              department: true,
            },
          },
        },
        orderBy: pagination.sortBy
          ? { [pagination.sortBy]: pagination.sortOrder === "desc" ? "desc" : "asc" }
          : { createdAt: "desc" },
        take: pagination.limit || 50,
        skip: (pagination.page - 1) * (pagination.limit || 50),
      });
    },
  },
  // Add more report types here
};
