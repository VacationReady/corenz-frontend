import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can access this employee
    const employee = await prisma.employee.findFirst({
      where: { id, companyId: session.user.companyId },
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
      employeeId: id,
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

    const normalizeAuditValue = (value: string | null | undefined): string =>
      value === null || value === undefined ? "" : value;

    const sections = Array.from(
      new Set(auditLogs.map((log: any) => log.section).filter(Boolean)),
    );

    const approvalMap = new Map<
      string,
      { approvedAt: Date | null; approvedBy: any | null }
    >();

    if (sections.length > 0) {
      const changeRequests = await (prisma as any).transactionalChangeRequest.findMany({
        where: {
          companyId: session.user.companyId,
          employeeId: id,
          section: { in: sections },
          status: "APPROVED",
        },
        include: {
          DecidedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      for (const req of changeRequests) {
        const diffs = (req.diffs as any[]) || [];
        for (const diff of diffs) {
          const key = `${req.section}:${diff.field}:${normalizeAuditValue(
            diff.oldValue,
          )}:${normalizeAuditValue(diff.newValue)}`;

          const existing = approvalMap.get(key);
          const approvedAt: Date | null = req.decidedAt ?? null;

          if (
            !existing ||
            (approvedAt && (!existing.approvedAt || approvedAt > existing.approvedAt))
          ) {
            approvalMap.set(key, {
              approvedAt,
              approvedBy: req.DecidedBy || null,
            });
          }
        }
      }
    }

    // Collect IDs for relational fields so we can return human-friendly names
    const managerUserIds = new Set<string>();
    const departmentIds = new Set<string>();
    const courseIds = new Set<string>();
    const providerIds = new Set<string>();
    const workingPatternIds = new Set<string>();
    const documentIds = new Set<string>();

    const addId = (set: Set<string>, value: string | null) => {
      if (value && value.trim() !== "") {
        set.add(value);
      }
    };

    for (const log of auditLogs) {
      const field = log.field;
      switch (field) {
        case "managerId":
          // managerId diffs store the manager's User.id
          addId(managerUserIds, log.oldValue);
          addId(managerUserIds, log.newValue);
          break;
        case "departmentId":
          addId(departmentIds, log.oldValue);
          addId(departmentIds, log.newValue);
          break;
        case "courseId":
          addId(courseIds, log.oldValue);
          addId(courseIds, log.newValue);
          break;
        case "providerId":
          addId(providerIds, log.oldValue);
          addId(providerIds, log.newValue);
          break;
        case "workingPatternId":
          addId(workingPatternIds, log.oldValue);
          addId(workingPatternIds, log.newValue);
          break;
        case "documentId":
          addId(documentIds, log.oldValue);
          addId(documentIds, log.newValue);
          break;
        default:
          break;
      }
    }

    // Fetch lookup data in batches (only when needed)
    const [managerUsers, departments, courses, providers, workingPatterns, documents] =
      await Promise.all([
        managerUserIds.size
          ? prisma.user.findMany({
              where: {
                id: { in: Array.from(managerUserIds) },
                companyId: session.user.companyId,
              },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            })
          : Promise.resolve([] as any[]),
        departmentIds.size
          ? prisma.department.findMany({
              where: {
                id: { in: Array.from(departmentIds) },
                companyId: session.user.companyId,
              },
              select: { id: true, name: true },
            })
          : Promise.resolve([] as any[]),
        courseIds.size
          ? prisma.course.findMany({
              where: {
                id: { in: Array.from(courseIds) },
                OR: [
                  { companyId: session.user.companyId },
                  { companyId: null },
                ],
              },
              select: { id: true, name: true },
            })
          : Promise.resolve([] as any[]),
        providerIds.size
          ? prisma.trainingProvider.findMany({
              where: {
                id: { in: Array.from(providerIds) },
                OR: [
                  { companyId: session.user.companyId },
                  { companyId: null },
                ],
              },
              select: { id: true, name: true },
            })
          : Promise.resolve([] as any[]),
        workingPatternIds.size
          ? prisma.workingPattern.findMany({
              where: {
                id: { in: Array.from(workingPatternIds) },
                companyId: session.user.companyId,
              },
              select: { id: true, name: true },
            })
          : Promise.resolve([] as any[]),
        documentIds.size
          ? prisma.document.findMany({
              where: {
                id: { in: Array.from(documentIds) },
                companyId: session.user.companyId,
              },
              select: { id: true, name: true },
            })
          : Promise.resolve([] as any[]),
      ]);

    const managerUserMap = managerUsers.reduce<Record<string, any>>((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    const departmentMap = departments.reduce<Record<string, any>>((acc, dept) => {
      acc[dept.id] = dept;
      return acc;
    }, {});

    const courseMap = courses.reduce<Record<string, any>>((acc, course) => {
      acc[course.id] = course;
      return acc;
    }, {});

    const providerMap = providers.reduce<Record<string, any>>((acc, provider) => {
      acc[provider.id] = provider;
      return acc;
    }, {});

    const workingPatternMap = workingPatterns.reduce<Record<string, any>>(
      (acc, pattern) => {
        acc[pattern.id] = pattern;
        return acc;
      },
      {},
    );

    const documentMap = documents.reduce<Record<string, any>>((acc, doc) => {
      acc[doc.id] = doc;
      return acc;
    }, {});

    const resolveDisplayValue = (field: string, value: string | null): string | null => {
      if (!value || value.trim() === "") return value;

      switch (field) {
        case "managerId": {
          const user = managerUserMap[value];
          if (user) {
            const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
            return fullName || user.email || value;
          }
          return value;
        }
        case "departmentId": {
          const dept = departmentMap[value];
          return (dept && dept.name) || value;
        }
        case "courseId": {
          const course = courseMap[value];
          return (course && course.name) || value;
        }
        case "providerId": {
          const provider = providerMap[value];
          return (provider && provider.name) || value;
        }
        case "workingPatternId": {
          const pattern = workingPatternMap[value];
          return (pattern && pattern.name) || value;
        }
        case "documentId": {
          const doc = documentMap[value];
          return (doc && doc.name) || value;
        }
        default:
          return value;
      }
    };

    const serialized = auditLogs.map((log: any) => {
      const key = `${log.section}:${log.field}:${normalizeAuditValue(
        log.oldValue,
      )}:${normalizeAuditValue(log.newValue)}`;
      const approval = approvalMap.get(key);

      return {
        id: log.id,
        section: log.section,
        field: log.field,
        oldValue: resolveDisplayValue(log.field, log.oldValue),
        newValue: resolveDisplayValue(log.field, log.newValue),
        reason: log.reason,
        changedAt: log.changedAt,
        changedBy: log.User,
        approvedAt: approval?.approvedAt || null,
        approvedBy: approval?.approvedBy || null,
      };
    });

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
