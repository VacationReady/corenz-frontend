import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can access this employee
    const employee = await prisma.employee.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: { User: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Authorization check - only ADMIN or manager/self can view audit logs
    const canAccess =
      session.user.role === "ADMIN" ||
      session.user.role === "SUPER_ADMIN" ||
      session.user.id === employee.userId ||
      session.user.id === employee.User.managerId;
    
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const section = url.searchParams.get("section");
    const field = url.searchParams.get("field");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {
      employeeId: params.id,
      companyId: session.user.companyId,
    };
    
    if (section) {
      where.section = section;
    }
    
    if (field) {
      where.field = field;
    }

    // Get audit logs with pagination
    const [auditLogs, total] = await Promise.all([
      prisma.employeeAuditLog.findMany({
        where,
        include: {
          User: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { changedAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.employeeAuditLog.count({ where }),
    ]);

    const serialized = auditLogs.map((log: any) => ({
      id: log.id,
      section: log.section,
      field: log.field,
      oldValue: log.oldValue,
      newValue: log.newValue,
      reason: log.reason,
      changedAt: log.changedAt,
      changedBy: log.User,
    }));

    return NextResponse.json({
      auditLogs: serialized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (e: any) {
    console.error("[audit-get]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
