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
      approvers: Array<{ order: number; userId: string }>;
    }>;
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
      stage.approvers.map((appr) =>
        (prismaTx as any).leaveApprovalDecision.create({
          data: {
            stageId: stageRow.id,
            approverId: appr.userId,
            order: appr.order,
            status: "PENDING",
            isActive: makeActive(appr.order),
          },
        }),
      ),
    );

    createdStages.push({ ...stageRow, decisions });
  }

  return createdStages;
}


