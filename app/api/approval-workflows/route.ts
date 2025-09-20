import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";

const ApproverSchema = z.object({ userId: z.string().min(1), order: z.number().int().nonnegative() });
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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const workflows = await prisma.approvalWorkflow.findMany({
    where: { companyId: session.user.companyId },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    include: {
      EventCategory: { select: { id: true, name: true } },
      stages: {
        orderBy: { order: "asc" },
        include: {
          approvers: { orderBy: { order: "asc" }, include: { user: { select: { id: true, name: true, email: true } } } },
        },
      },
    },
  });

  const data = workflows.map((w) => ({
    id: w.id,
    name: w.name,
    eventCategory: w.EventCategory,
    scope: {
      type: w.scopeType,
      departmentIds: w.departmentIds,
      jobRoleIds: w.jobRoleIds,
      employeeIds: w.employeeIds,
    },
    priority: w.priority,
    isActive: w.isActive,
    stages: w.stages.map((s) => ({
      id: s.id,
      name: s.name,
      mode: s.mode,
      order: s.order,
      approvers: s.approvers.map((a) => ({
        id: a.id,
        userId: a.userId,
        name: a.user?.name ?? null,
        email: a.user?.email ?? null,
        order: a.order,
      })),
    })),
  }));

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Permission: Admin with settings edit
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, PermissionProfile: true } });
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
    const created = await prisma.$transaction(async (tx) => {
      const workflow = await tx.approvalWorkflow.create({
        data: {
          companyId: session.user.companyId!,
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

      for (const st of stages) {
        const stage = await tx.approvalWorkflowStage.create({
          data: {
            workflowId: workflow.id,
            name: st.name ?? null,
            order: st.order,
            mode: st.mode as any,
          },
        });
        for (const appr of st.approvers) {
          await tx.approvalWorkflowStageApprover.create({
            data: {
              stageId: stage.id,
              userId: appr.userId,
              order: appr.order,
            },
          });
        }
      }

      return tx.approvalWorkflow.findUnique({
        where: { id: workflow.id },
        include: {
          EventCategory: { select: { id: true, name: true } },
          stages: {
            orderBy: { order: "asc" },
            include: { approvers: { orderBy: { order: "asc" }, include: { user: { select: { id: true, name: true, email: true } } } } },
          },
        },
      });
    });

    return NextResponse.json({ success: true, data: created });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || "Failed to create" }, { status: 500 });
  }
}
