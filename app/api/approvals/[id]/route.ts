import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { processDecision } from "@/lib/advanceLeaveApproval";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensurePrismaConnected();
    const { id } = await context.params; // This is a LeaveApprovalDecision.id when type is LEAVE
    const body = await req.json().catch(() => ({} as any));
    const action = body?.action as "approve" | "decline" | undefined;
    const comment = (body?.comment ?? "").toString().trim();

    if (!action || !["approve", "decline"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

    // Ensure decision exists and belongs to this company and user (authorization)
    const decision = await prisma.leaveApprovalDecision.findUnique({
      where: { id },
      include: { stage: { include: { leaveRequest: true } } },
    });
    if (!decision) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (decision.approverId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (decision.stage.leaveRequest.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Decline must include a non-empty comment
    if (action === "decline" && comment.length === 0) {
      return NextResponse.json({ error: "Comment is required when declining" }, { status: 400 });
    }

    // When declining, persist a comment at stage level (metadata) for future retrieval
    if (action === "decline" && comment) {
      await prisma.leaveApprovalStage.update({
        where: { id: decision.stageId },
        data: { name: decision.stage?.name ?? null },
      });
      // Store comment on GlobalAuditLog for traceability
      await prisma.globalAuditLog.create({
        data: {
          id: crypto.randomUUID(),
          companyId: session.user.companyId!,
          entityType: "LEAVE_POLICY" as any,
          entityId: decision.stage.leaveRequestId,
          action: "UPDATED" as any,
          actorId: session.user.id,
          changes: {
            decisionId: decision.id,
            stageId: decision.stageId,
            comment,
            action: "decline",
          },
          metadata: { source: "dashboard-action-item" },
        },
      });
    }

    const result = await processDecision({
      decisionId: decision.id,
      action,
      actorUserId: session.user.id,
    });

    // Return the leaveRequestId we already know from the decision's stage to avoid nullable typing
    return NextResponse.json({ success: true, data: { leaveRequestId: decision.stage.leaveRequestId } });
  } catch (error: any) {
    console.error("[APPROVALS_DECISION_POST]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to perform action" },
      { status: 500 },
    );
  }
}
