import { NextResponse } from "next/server";
import { ensurePrismaConnected, prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { hasPermission } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

type PermissionUser = Parameters<typeof hasPermission>[0];

const MAX_RESULTS_PER_ENTITY = 5;

export async function GET(req: Request) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") ?? "").trim();

    if (!query) {
      return NextResponse.json({
        employees: [],
        documents: [],
        workflows: [],
      });
    }

    const companyId = session.user.companyId;
    const searchTerms = query.split(/\s+/).filter(Boolean);

    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        departmentId: true,
        jobRoleId: true,
        PermissionProfile: true,
      },
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { PermissionProfile, ...userWithoutProfile } = userRecord;
    const permissionUser = {
      ...userWithoutProfile,
      permissionProfile: PermissionProfile,
    } as unknown as PermissionUser;

    const employeeWhere: Prisma.EmployeeWhereInput = {
      companyId,
      isActive: true,
    };

    if (searchTerms.length) {
      employeeWhere.AND = [
        ...(employeeWhere.AND ?? []),
        ...searchTerms.map((term) => ({
          OR: [
            { User: { firstName: { contains: term, mode: "insensitive" } } },
            { User: { lastName: { contains: term, mode: "insensitive" } } },
            { User: { email: { contains: term, mode: "insensitive" } } },
            { Department: { name: { contains: term, mode: "insensitive" } } },
            { JobRole: { name: { contains: term, mode: "insensitive" } } },
          ],
        })),
      ];
    }

    if (session.user.role === "MANAGER") {
      const subordinateUsers = await prisma.user.findMany({
        where: {
          managerId: session.user.id,
          companyId,
        },
        select: { id: true },
      });
      const allowedUserIds = [
        session.user.id,
        ...subordinateUsers.map((user) => user.id),
      ];
      employeeWhere.AND = [
        ...(employeeWhere.AND ?? []),
        { userId: { in: allowedUserIds } },
      ];
    } else if (session.user.role === "EMPLOYEE") {
      employeeWhere.AND = [
        ...(employeeWhere.AND ?? []),
        { userId: session.user.id },
      ];
    }

    const employeePromise = prisma.employee.findMany({
      where: employeeWhere,
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            name: true,
            role: true,
            profileImageUrl: true,
          },
        },
        Department: { select: { id: true, name: true } },
        JobRole: { select: { id: true, name: true } },
      },
      take: MAX_RESULTS_PER_ENTITY,
      orderBy: { userId: "asc" },
    });

    const canEditDocuments = hasPermission(
      permissionUser,
      "documents",
      "edit",
    );
    const canReadDocuments = hasPermission(
      permissionUser,
      "documents",
      "read",
    );
    const treatAsDocumentAdmin =
      userRecord.role === "ADMIN" || canEditDocuments;

    const documentWhere: Prisma.DocumentWhereInput = {
      companyId,
      deletedAt: null,
    };

    if (searchTerms.length) {
      documentWhere.AND = [
        ...(documentWhere.AND ?? []),
        ...searchTerms.map((term) => ({
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { description: { contains: term, mode: "insensitive" } },
            { category: { contains: term, mode: "insensitive" } },
          ],
        })),
      ];
    }

    let documentPromise: Promise<
      {
        id: string;
        name: string;
        description: string | null;
        category: string | null;
        type: string;
        requiresAck: boolean;
        createdAt: Date;
      }[]
    > = Promise.resolve([]);

    if (canReadDocuments) {
      if (!treatAsDocumentAdmin) {
        const scopeConditions: Prisma.DocumentWhereInput[] = [
          { AND: [{ Department: { none: {} } }, { JobRole: { none: {} } }] },
        ];

        if (userRecord.departmentId) {
          scopeConditions.push({
            Department: { some: { id: userRecord.departmentId } },
          });
        }

        if (userRecord.jobRoleId) {
          scopeConditions.push({
            JobRole: { some: { id: userRecord.jobRoleId } },
          });
        }

        documentWhere.AND = [
          ...(documentWhere.AND ?? []),
          { canViewEmployee: true },
          { OR: scopeConditions },
        ];
      }

      documentPromise = prisma.document.findMany({
        where: documentWhere,
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          type: true,
          requiresAck: true,
          createdAt: true,
        },
        take: MAX_RESULTS_PER_ENTITY,
        orderBy: { createdAt: "desc" },
      });
    }

    const canViewWorkflows =
      session.user.role === "ADMIN" ||
      hasPermission(permissionUser, "approvals", "read") ||
      hasPermission(permissionUser, "settings", "read");

    let workflowPromise: Promise<
      {
        id: string;
        name: string;
        scopeType: string;
        isActive: boolean;
        priority: number;
        updatedAt: Date;
        EventCategory: { name: string | null } | null;
      }[]
    > = Promise.resolve([]);

    if (canViewWorkflows) {
      const workflowWhere: Prisma.ApprovalWorkflowWhereInput = {
        companyId,
      };

      if (searchTerms.length) {
        workflowWhere.AND = searchTerms.map((term) => ({
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { EventCategory: { name: { contains: term, mode: "insensitive" } } },
          ],
        }));
      }

      workflowPromise = prisma.approvalWorkflow.findMany({
        where: workflowWhere,
        select: {
          id: true,
          name: true,
          scopeType: true,
          isActive: true,
          priority: true,
          updatedAt: true,
          EventCategory: { select: { name: true } },
        },
        take: MAX_RESULTS_PER_ENTITY,
        orderBy: { updatedAt: "desc" },
      });
    }

    const [employees, documents, workflows] = await Promise.all([
      employeePromise,
      documentPromise,
      workflowPromise,
    ]);

    return NextResponse.json({
      employees: employees.map((employee) => ({
        id: employee.id,
        userId: employee.userId,
        name:
          `${employee.User?.firstName ?? ""} ${
            employee.User?.lastName ?? ""
          }`.trim() || employee.User?.name || employee.User?.email || "",
        email: employee.User?.email ?? null,
        role: employee.User?.role ?? null,
        department: employee.Department?.name ?? null,
        jobRole: employee.JobRole?.name ?? null,
        profileImageUrl: employee.User?.profileImageUrl ?? null,
      })),
      documents: documents.map((document) => ({
        id: document.id,
        name: document.name,
        description: document.description,
        category: document.category,
        type: document.type,
        requiresAck: document.requiresAck,
        createdAt: document.createdAt.toISOString(),
      })),
      workflows: workflows.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
        scopeType: workflow.scopeType,
        isActive: workflow.isActive,
        priority: workflow.priority,
        updatedAt: workflow.updatedAt.toISOString(),
        eventCategory: workflow.EventCategory?.name ?? null,
      })),
    });
  } catch (error) {
    console.error("Search endpoint error", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 },
    );
  }
}
