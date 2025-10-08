import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";

const updateObjectiveSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "AT_RISK", "COMPLETED", "CANCELLED", "DEFERRED"]).optional(),
  progress: z.number().min(0).max(100).optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  tags: z.array(z.string()).optional(),
  owner: z.string().optional(),
  visibility: z.enum(["PRIVATE", "TEAM", "DEPARTMENT", "COMPANY"]).optional(),
});

function isManagerOrAdmin(role?: string | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER" || role === "HR";
}

async function findObjective(id: string, companyId: string) {
  // Try company objective first
  const companyObj = await prisma.companyObjective.findFirst({
    where: { id, companyId },
    include: {
      Owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      keyResults: true,
      updates: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          Author: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });
  if (companyObj) return { objective: companyObj, type: "company" };

  // Try team objective
  const teamObj = await prisma.teamObjective.findFirst({
    where: { id, companyId },
    include: {
      Owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      ParentObjective: { select: { id: true, title: true } },
      keyResults: true,
      updates: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          Author: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });
  if (teamObj) return { objective: teamObj, type: "team" };

  // Try personal objective
  const personalObj = await prisma.personalObjective.findFirst({
    where: { id, companyId },
    include: {
      ParentObjective: { select: { id: true, title: true } },
      keyResults: true,
      updates: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          Author: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });
  if (personalObj) return { objective: personalObj, type: "personal" };

  return null;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await findObjective(id, session.user.companyId);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check access for personal objectives
    if (result.type === "personal") {
      const personalObj = result.objective as any;
      const canView =
        isManagerOrAdmin(session.user.role) ||
        session.user.employee?.id === personalObj.employeeId;

      if (!canView) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ objective: result.objective, type: result.type });
  } catch (error) {
    console.error("[objective-get]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = updateObjectiveSchema.parse(body);

    const result = await findObjective(id, session.user.companyId);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.progress !== undefined) updateData.progress = validated.progress;
    if (validated.priority !== undefined) updateData.priority = validated.priority;
    if (validated.tags !== undefined) updateData.tags = validated.tags;
    if (validated.dueDate !== undefined) {
      updateData.dueDate = validated.dueDate ? new Date(validated.dueDate) : null;
    }
    if (validated.startDate !== undefined) {
      updateData.startDate = validated.startDate ? new Date(validated.startDate) : null;
    }

    let updatedObjective: any;

    if (result.type === "company") {
      if (!isManagerOrAdmin(session.user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (validated.owner !== undefined) updateData.owner = validated.owner;

      updatedObjective = await prisma.companyObjective.update({
        where: { id },
        data: updateData,
        include: {
          Owner: { select: { id: true, firstName: true, lastName: true, email: true } },
          keyResults: true,
        },
      });
    } else if (result.type === "team") {
      if (!isManagerOrAdmin(session.user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (validated.owner !== undefined) updateData.owner = validated.owner;

      updatedObjective = await prisma.teamObjective.update({
        where: { id },
        data: updateData,
        include: {
          Owner: { select: { id: true, firstName: true, lastName: true, email: true } },
          ParentObjective: { select: { id: true, title: true } },
          keyResults: true,
        },
      });
    } else if (result.type === "personal") {
      const personalObj = result.objective as any;
      const canEdit =
        isManagerOrAdmin(session.user.role) ||
        session.user.employee?.id === personalObj.employeeId;

      if (!canEdit) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (validated.visibility !== undefined) updateData.visibility = validated.visibility;

      updatedObjective = await prisma.personalObjective.update({
        where: { id },
        data: updateData,
        include: {
          ParentObjective: { select: { id: true, title: true } },
          keyResults: true,
        },
      });
    }

    return NextResponse.json({ objective: updatedObjective });
  } catch (error) {
    console.error("[objective-put]", error);
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

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await findObjective(id, session.user.companyId);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Authorization checks
    if (result.type === "company" || result.type === "team") {
      if (!isManagerOrAdmin(session.user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (result.type === "personal") {
      const personalObj = result.objective as any;
      const canDelete =
        isManagerOrAdmin(session.user.role) ||
        session.user.employee?.id === personalObj.employeeId;

      if (!canDelete) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Delete the objective (cascading deletes handle key results and updates)
    if (result.type === "company") {
      await prisma.companyObjective.delete({ where: { id } });
    } else if (result.type === "team") {
      await prisma.teamObjective.delete({ where: { id } });
    } else if (result.type === "personal") {
      await prisma.personalObjective.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[objective-delete]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
