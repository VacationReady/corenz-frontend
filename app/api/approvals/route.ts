import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "PENDING").toUpperCase();
  const scope = url.searchParams.get("scope") || "my"; // my | all

  const companyId = session.user.companyId;
  const approverId = session.user.id;

  // Leave approvals → active decisions
  const leaveDecisions = await prisma.leaveApprovalDecision.findMany({
    where: {
      status: status as any,
      isActive: true,
      ...(scope === "my" ? { approverId } : {}),
      stage: { leaveRequest: { Company: { id: companyId } } },
    },
    include: {
      stage: {
        include: {
          leaveRequest: { include: { Employee: { include: { User: true } }, EventCategory: true } },
        },
      },
    },
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  // Transactional approvals
  const txnApprovals = await prisma.transactionalApproval.findMany({
    where: {
      companyId,
      status: status as any,
      ...(scope === "my" ? { approverIds: { has: approverId } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const items = [
    ...leaveDecisions.map((d) => ({
      id: d.id,
      type: "LEAVE" as const,
      title: `${d.stage.leaveRequest.Employee.User?.firstName ?? "Employee"} — ${d.stage.leaveRequest.EventCategory?.name ?? "Leave"}`,
      subtitle: `${new Date(d.stage.leaveRequest.startDate).toLocaleDateString()} to ${new Date(d.stage.leaveRequest.endDate).toLocaleDateString()}`,
    })),
    ...txnApprovals.map((t) => ({
      id: t.id,
      type: "TRANSACTIONAL" as const,
      title: t.title ?? "Transactional change",
      subtitle: t.subtitle ?? undefined,
    })),
  ];

  return NextResponse.json({ items });
}


