import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { z } from "zod";

const AuditLogQuerySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val) || 1)
    .optional(),
  limit: z
    .string()
    .transform((val) => Math.min(parseInt(val) || 50, 100))
    .optional(),
  entityType: z.string().optional(),
  action: z.string().optional(),
  actorId: z.string().optional(),
  employeeId: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
});

// GET: Fetch audit logs with filtering and pagination
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const validatedParams = AuditLogQuerySchema.parse(queryParams);

    const page = validatedParams.page || 1;
    const limit = validatedParams.limit || 50;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      companyId: session.user.companyId,
    };

    if (validatedParams.entityType) {
      whereClause.entityType = validatedParams.entityType;
    }

    if (validatedParams.action) {
      whereClause.action = validatedParams.action;
    }

    if (validatedParams.actorId) {
      whereClause.actorId = validatedParams.actorId;
    }

    // Filter by employeeId (matches entityId for EMPLOYEE type OR metadata.employeeId
    // OR announcement recipient list stored in metadata.recipients)
    if (validatedParams.employeeId) {
      whereClause.OR = [
        {
          entityType: "EMPLOYEE",
          entityId: validatedParams.employeeId,
        },
        {
          metadata: {
            path: ["employeeId"],
            equals: validatedParams.employeeId,
          },
        },
        {
          metadata: {
            path: ["recipients"],
            array_contains: [validatedParams.employeeId],
          },
        },
      ];
    }

    if (validatedParams.dateFrom || validatedParams.dateTo) {
      whereClause.timestamp = {};
      if (validatedParams.dateFrom) {
        whereClause.timestamp.gte = new Date(validatedParams.dateFrom);
      }
      if (validatedParams.dateTo) {
        whereClause.timestamp.lte = new Date(validatedParams.dateTo);
      }
    }

    if (validatedParams.search) {
      const searchTerm = validatedParams.search.toLowerCase();
      whereClause.OR = [
        { entityId: { contains: searchTerm, mode: "insensitive" } },
        { User: { email: { contains: searchTerm, mode: "insensitive" } } },
        { User: { name: { contains: searchTerm, mode: "insensitive" } } },
        { changes: { path: [], string_contains: searchTerm } },
        { metadata: { path: [], string_contains: searchTerm } },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.globalAuditLog.count({
      where: whereClause,
    });

    // Fetch audit logs
    const logs = await prisma.globalAuditLog.findMany({
      where: whereClause,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      skip,
      take: limit,
    });

    // For EMPLOYEE entity types, fetch employee information
    const employeeLogs = logs.filter(log => log.entityType === "EMPLOYEE");
    const employeeIds = employeeLogs.map(log => log.entityId);
    
    let employeeMap: Record<string, any> = {};
    if (employeeIds.length > 0) {
      const employees = await prisma.employee.findMany({
        where: {
          id: { in: employeeIds },
          companyId: session.user.companyId,
        },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
      
      employeeMap = employees.reduce((acc, emp) => {
        acc[emp.id] = emp;
        return acc;
      }, {} as Record<string, any>);
    }

    // Enrich logs with employee information
    const enrichedLogs = logs.map(log => ({
      ...log,
      employee: log.entityType === "EMPLOYEE" ? employeeMap[log.entityId] : null,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      logs: enrichedLogs,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        pageSize: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      totalCount,
      totalPages,
    });
  } catch (error) {
    console.error("GET /api/audit-logs error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 },
    );
  }
}

// POST: Create a new audit log entry (for system use)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const AuditLogCreateSchema = z.object({
      entityType: z.enum([
        "LEAVE_POLICY",
        "LEAVE_REQUEST",
        "PERMISSION_PROFILE",
        "EVENT_RULE",
        "DOCUMENT_TYPE",
        "AUTOMATION_RULE",
        "NOTIFICATION_CHANNEL",
        "SSO_CONFIG",
        "SCIM_CONFIG",
        "BRANDING_CONFIG",
        "EMPLOYEE",
        "EMERGENCY_CONTACT",
        "EMPLOYMENT_CHECK",
        "DRIVER_LICENSE",
        "TRAINING_RECORD",
        "ANNOUNCEMENT",
      ]),
      entityId: z.string(),
      action: z.enum([
        "CREATED",
        "UPDATED",
        "DELETED",
        "ACTIVATED",
        "DEACTIVATED",
      ]),
      changes: z.any().optional(),
      metadata: z.any().optional(),
    });

    const data = AuditLogCreateSchema.parse(body);

    const created = await prisma.globalAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: data.entityType as any,
        entityId: data.entityId,
        action: data.action as any,
        actorId: session.user.id,
        actorType: (session.user as any)?.role === "SYSTEM" ? "SYSTEM" : "USER",
        changes: data.changes,
        metadata: data.metadata,
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/audit-logs error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create audit log entry" },
      { status: 500 },
    );
  }
}

