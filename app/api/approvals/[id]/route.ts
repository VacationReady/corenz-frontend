import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const { action } = await req.json();
  if (!["approve", "decline"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Determine if this is a leave decision or a transactional approval
  // Try leave first
  const leaveDecision = await prisma.leaveApprovalDecision.findUnique({ where: { id } });
  if (leaveDecision) {
    // Only the assigned approver can act
    if (leaveDecision.approverId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.leaveApprovalDecision.update({
      where: { id },
      data: {
        status: action === "approve" ? "APPROVED" : "DECLINED",
        respondedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  }

  // Fallback to transactional approval
  const txn = await (prisma as any).transactionalApproval.findUnique({ where: { id } });
  if (!txn || txn.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Approver must be in approverIds
  if (!txn.approverIds.includes(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.transactionalApproval.update({
    where: { id },
    data: {
      status: action === "approve" ? "APPROVED" : "DECLINED",
      approvedAt: new Date(),
      approvedById: session.user.id,
    },
  });

  return NextResponse.json({ ok: true });
}


