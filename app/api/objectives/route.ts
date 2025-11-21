import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";

const objectiveSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["company", "team", "personal"]),
  owner: z.string().optional(),
  teamId: z.string().optional(),
  employeeId: z.string().optional(),
  parentObjectiveId: z.string().optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "AT_RISK", "COMPLETED", "CANCELLED", "DEFERRED"]).optional(),
  progress: z.number().min(0).max(100).optional(),
  dueDate: z.string().optional(),
  startDate: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(["PRIVATE", "TEAM", "DEPARTMENT", "COMPANY"]).optional(),
  keyResults: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    targetValue: z.number(),
    currentValue: z.number().optional(),
    unit: z.string().optional(),
    dueDate: z.string().optional(),
  })).optional(),
});

function isManagerOrAdmin(role?: string | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER" || role === "HR";
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // company, team, personal
    const status = searchParams.get("status");
    const owner = searchParams.get("owner");
    const employeeId = searchParams.get("employeeId");
    const includeKeyResults = searchParams.get("includeKeyResults") === "true";

    // Fetch employee record for the current user
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });

    let objectives: any[] = [];

    if (type === "company" || !type) {
      const companyObjectives = await prisma.companyObjective.findMany({
        where: {
          companyId: session.user.companyId,
          ...(status && { status: status as any }),
          ...(owner && { owner }),
        },
        include: {
          Owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          Creator: {
            select: { id: true, firstName: true, lastName: true },
          },
          ...(includeKeyResults && {
            keyResults: true,
            updates: {
              take: 3,
              orderBy: { createdAt: "desc" },
              include: {
                Author: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
          }),
        },
        orderBy: { createdAt: "desc" },
      });
      objectives.push(...companyObjectives.map(obj => ({ ...obj, type: "company" })));
    }

    if (type === "team" || !type) {
      const teamObjectives = await prisma.teamObjective.findMany({
        where: {
          companyId: session.user.companyId,
          ...(status && { status: status as any }),
          ...(owner && { owner }),
        },
        include: {
          Owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          Creator: {
            select: { id: true, firstName: true, lastName: true },
          },
          ParentObjective: {
            select: { id: true, title: true },
          },
          ...(includeKeyResults && {
            keyResults: true,
            updates: {
              take: 3,
              orderBy: { createdAt: "desc" },
              include: {
                Author: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
          }),
        },
        orderBy: { createdAt: "desc" },
      });
      objectives.push(...teamObjectives.map(obj => ({ ...obj, type: "team" })));
    }

    if (!type && !employeeId && isManagerOrAdmin(session.user.role)) {
      const personalObjectives = await prisma.personalObjective.findMany({
        where: {
          companyId: session.user.companyId,
          ...(status && { status: status as any }),
        },
        include: {
          ParentObjective: {
            select: { id: true, title: true },
          },
          ...(includeKeyResults && {
            keyResults: true,
            updates: {
              take: 3,
              orderBy: { createdAt: "desc" },
              include: {
                Author: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
          }),
        },
        orderBy: { createdAt: "desc" },
      });
      objectives.push(...personalObjectives.map(obj => ({ ...obj, type: "personal" })));
    }

    if (type === "personal" || employeeId) {
      const canViewAll = isManagerOrAdmin(session.user.role);
      const targetEmployeeId = employeeId || employee?.id;

      if (!canViewAll && employeeId && employeeId !== employee?.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (targetEmployeeId) {
        const personalObjectives = await prisma.personalObjective.findMany({
          where: {
            employeeId: targetEmployeeId,
            companyId: session.user.companyId,
            ...(status && { status: status as any }),
          },
          include: {
            ParentObjective: {
              select: { id: true, title: true },
            },
            ...(includeKeyResults && {
              keyResults: true,
              updates: {
                take: 3,
                orderBy: { createdAt: "desc" },
                include: {
                  Author: {
                    select: { id: true, firstName: true, lastName: true },
                  },
                },
              },
            }),
          },
          orderBy: { createdAt: "desc" },
        });
        objectives.push(...personalObjectives.map(obj => ({ ...obj, type: "personal" })));
      }
    }

    return NextResponse.json({ objectives });
  } catch (error) {
    console.error("[objectives-get]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch employee record for the current user
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });

    const body = await req.json();
    const validated = objectiveSchema.parse(body);

    const { type, keyResults, ...objectiveData } = validated;

    let createdObjective: any;

    if (type === "company") {
      if (!isManagerOrAdmin(session.user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      createdObjective = await prisma.companyObjective.create({
        data: {
          id: crypto.randomUUID(),
          companyId: session.user.companyId,
          title: objectiveData.title,
          description: objectiveData.description,
          owner: objectiveData.owner,
          status: objectiveData.status || "NOT_STARTED",
          progress: objectiveData.progress || 0,
          dueDate: objectiveData.dueDate ? new Date(objectiveData.dueDate) : null,
          startDate: objectiveData.startDate ? new Date(objectiveData.startDate) : null,
          priority: objectiveData.priority || "MEDIUM",
          tags: objectiveData.tags || [],
          createdBy: session.user.id,
        },
        include: {
          Owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      // Create key results if provided
      if (keyResults && keyResults.length > 0) {
        await Promise.all(
          keyResults.map((kr) =>
            prisma.objectiveKeyResult.create({
              data: {
                id: crypto.randomUUID(),
                title: kr.title,
                description: kr.description,
                targetValue: kr.targetValue,
                currentValue: kr.currentValue || 0,
                unit: kr.unit,
                dueDate: kr.dueDate ? new Date(kr.dueDate) : null,
                companyObjectiveId: createdObjective.id,
              },
            })
          )
        );
      }
    } else if (type === "team") {
      if (!isManagerOrAdmin(session.user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      createdObjective = await prisma.teamObjective.create({
        data: {
          id: crypto.randomUUID(),
          companyId: session.user.companyId,
          teamId: objectiveData.teamId,
          title: objectiveData.title,
          description: objectiveData.description,
          owner: objectiveData.owner,
          parentObjectiveId: objectiveData.parentObjectiveId,
          status: objectiveData.status || "NOT_STARTED",
          progress: objectiveData.progress || 0,
          dueDate: objectiveData.dueDate ? new Date(objectiveData.dueDate) : null,
          startDate: objectiveData.startDate ? new Date(objectiveData.startDate) : null,
          priority: objectiveData.priority || "MEDIUM",
          tags: objectiveData.tags || [],
          createdBy: session.user.id,
        },
        include: {
          Owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          ParentObjective: {
            select: { id: true, title: true },
          },
        },
      });

      if (keyResults && keyResults.length > 0) {
        await Promise.all(
          keyResults.map((kr) =>
            prisma.objectiveKeyResult.create({
              data: {
                id: crypto.randomUUID(),
                title: kr.title,
                description: kr.description,
                targetValue: kr.targetValue,
                currentValue: kr.currentValue || 0,
                unit: kr.unit,
                dueDate: kr.dueDate ? new Date(kr.dueDate) : null,
                teamObjectiveId: createdObjective.id,
              },
            })
          )
        );
      }
    } else if (type === "personal") {
      if (!objectiveData.employeeId) {
        return NextResponse.json(
          { error: "Employee ID required for personal objectives" },
          { status: 400 }
        );
      }

      // Verify user can create objectives for this employee
      const canCreate =
        isManagerOrAdmin(session.user.role) ||
        (employee && employee.id === objectiveData.employeeId);

      if (!canCreate) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      createdObjective = await prisma.personalObjective.create({
        data: {
          id: crypto.randomUUID(),
          employeeId: objectiveData.employeeId,
          companyId: session.user.companyId,
          title: objectiveData.title,
          description: objectiveData.description,
          parentObjectiveId: objectiveData.parentObjectiveId,
          status: objectiveData.status || "NOT_STARTED",
          progress: objectiveData.progress || 0,
          dueDate: objectiveData.dueDate ? new Date(objectiveData.dueDate) : null,
          startDate: objectiveData.startDate ? new Date(objectiveData.startDate) : null,
          priority: objectiveData.priority || "MEDIUM",
          tags: objectiveData.tags || [],
          visibility: objectiveData.visibility || "TEAM",
        },
        include: {
          ParentObjective: {
            select: { id: true, title: true },
          },
        },
      });

      if (keyResults && keyResults.length > 0) {
        await Promise.all(
          keyResults.map((kr) =>
            prisma.objectiveKeyResult.create({
              data: {
                id: crypto.randomUUID(),
                title: kr.title,
                description: kr.description,
                targetValue: kr.targetValue,
                currentValue: kr.currentValue || 0,
                unit: kr.unit,
                dueDate: kr.dueDate ? new Date(kr.dueDate) : null,
                personalObjectiveId: createdObjective.id,
              },
            })
          )
        );
      }
    }

    return NextResponse.json({ objective: createdObjective }, { status: 201 });
  } catch (error) {
    console.error("[objectives-post]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
