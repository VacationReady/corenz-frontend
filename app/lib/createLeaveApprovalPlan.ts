import type { PrismaClient, ApprovalStageMode } from "@prisma/client";

type PrismaLike = Pick<PrismaClient, "leaveApprovalStage" | "leaveApprovalDecision">;

export async function createLeaveApprovalPlan({
  prismaTx,
  leaveRequestId,
  workflow,
}: {
  prismaTx: PrismaLike;
  leaveRequestId: string;
  workflow: {
    stages: Array<{
      id: string;
      name: string | null;
      mode: ApprovalStageMode;
      order: number;
      approvers: Array<{ order: number; userId?: string; type?: "USER" | "MANAGER" }>;
    }>;
  };
  // Optional context for resolving dynamic approvers like MANAGER
  context?: {
    requesterUserId?: string;
    managerUserId?: string | null;
  };
}) {
  const createdStages = [] as any[];

  for (const stage of workflow.stages) {
    const stageRow = await (prismaTx as any).leaveApprovalStage.create({
      data: {
        leaveRequestId,
        workflowStageId: stage.id,
        name: stage.name,
        order: stage.order,
        mode: stage.mode,
        status: "PENDING",
        isActive: stage.order === 0,
      },
    });

    const isSequential = stage.mode === "SEQUENTIAL";
    const makeActive = (order: number) =>
      isSequential ? order === 0 : true;

    const decisions = await Promise.all(
      stage.approvers.map((appr) => {
        const type = appr.type ?? "USER";
        const resolvedApproverId =
          type === "MANAGER"
            ? ((workflow as any).context?.managerUserId as string | undefined)
            : (appr.userId as string | undefined);
        if (!resolvedApproverId) {
          // Skip creating a decision if we cannot resolve the approver
          return Promise.resolve(null);
        }
        return (prismaTx as any).leaveApprovalDecision.create({
          data: {
            stageId: stageRow.id,
            approverId: resolvedApproverId,
            order: appr.order,
            status: "PENDING",
            isActive: makeActive(appr.order),
          },
        });
      }),
    );

    createdStages.push({ ...stageRow, decisions: decisions.filter(Boolean) });
  }

  return createdStages;
}


