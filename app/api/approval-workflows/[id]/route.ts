import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";

const ApproverSchema = z
  .object({
    type: z.enum(["USER", "MANAGER"]).default("USER"),
    userId: z.string().optional(),
    order: z.number().int().nonnegative(),
  })
  .refine((v) => (v.type === "USER" ? !!v.userId : true), {
    message: "userId is required when type is USER",
    path: ["userId"],
  });
const StageSchema = z.object({
  name: z.string().optional().nullable(),
  mode: z.enum(["SEQUENTIAL", "FIRST_RESPONDER", "UNANIMOUS"]),
  order: z.number().int().nonnegative(),
  approvers: z.array(ApproverSchema).min(1, "At least one approver per stage"),
});
const ScopeSchema = z.object({
  type: z.enum(["COMPANY", "DEPARTMENT", "JOB_ROLE", "EMPLOYEE"]),
  departmentIds: z.array(z.string()).optional(),
  jobRoleIds: z.array(z.string()).optional(),
  employeeIds: z.array(z.string()).optional(),
});
const WorkflowSchema = z.object({
  name: z.string().min(1),
  eventCategoryId: z.string().min(1),
  scope: ScopeSchema,
  priority: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
  stages: z.array(StageSchema).min(1, "At least one stage is required"),
});

export async function GET(_req: NextRequest, context: any) {
  const rawParams = context?.params;
  const { id } = rawParams?.then ? await rawParams : rawParams;
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const wf = await prisma.approvalWorkflow.findFirst({
    where: { id, companyId: session.user.companyId },
    include: {
      EventCategory: { select: { id: true, name: true } },
      stages: {
        orderBy: { order: "asc" },
        include: {
          approvers: {
            orderBy: { order: "asc" },
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });
  if (!wf) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: wf });
}

export async function PUT(req: NextRequest, context: any) {
  const rawParams = context?.params;
  const { id } = rawParams?.then ? await rawParams : rawParams;
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, PermissionProfile: true },
  });
  if (!user || user.role !== "ADMIN" || !hasPermission(user as any, "settings", "edit")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json();
  const parsed = WorkflowSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, eventCategoryId, scope, priority = 0, isActive = true, stages } = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.approvalWorkflow.findFirst({
        where: { id, companyId: session.user.companyId },
      });
      if (!existing) throw new Error("Not found");

      await tx.approvalWorkflow.update({
        where: { id: existing.id },
        data: {
          name,
          eventCategoryId,
          scopeType: scope.type as any,
          departmentIds: scope.departmentIds ?? [],
          jobRoleIds: scope.jobRoleIds ?? [],
          employeeIds: scope.employeeIds ?? [],
          priority,
          isActive,
        },
      });

      // Replace nested
      const stageIds = (
        await tx.approvalWorkflowStage.findMany({
          where: { workflowId: existing.id },
          select: { id: true },
        })
      ).map((s) => s.id);
      if (stageIds.length > 0) {
        await tx.approvalWorkflowStageApprover.deleteMany({ where: { stageId: { in: stageIds } } });
        await tx.approvalWorkflowStage.deleteMany({ where: { id: { in: stageIds } } });
      }

      for (const st of stages) {
        const stage = await tx.approvalWorkflowStage.create({
          data: {
            workflowId: existing.id,
            name: st.name ?? null,
            order: st.order,
            mode: st.mode as any,
          },
        });
        for (const appr of st.approvers) {
          await tx.approvalWorkflowStageApprover.create({
            data: { stageId: stage.id, type: appr.type as any, userId: appr.type === "USER" ? (appr.userId as string) : null, order: appr.order },
          });
        }
      }

      return tx.approvalWorkflow.findUnique({
        where: { id: existing.id },
        include: {
          EventCategory: { select: { id: true, name: true } },
          stages: {
            orderBy: { order: "asc" },
            include: {
              approvers: {
                orderBy: { order: "asc" },
                include: { user: { select: { id: true, name: true, email: true } } },
              },
            },
          },
        },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "Failed to update" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, context: any) {
  const rawParams = context?.params;
  const { id } = rawParams?.then ? await rawParams : rawParams;
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, PermissionProfile: true },
  });
  if (!user || user.role !== "ADMIN" || !hasPermission(user as any, "settings", "edit")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.approvalWorkflow.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "Failed to delete" },
      { status: 500 },
    );
  }
}
