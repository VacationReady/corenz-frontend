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
  const limitParam = url.searchParams.get("limit");
  const take = (() => {
    const n = limitParam ? parseInt(limitParam, 10) : NaN;
    if (Number.isNaN(n)) return 20;
    return Math.max(1, Math.min(50, n));
  })();

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
    take,
    orderBy: { createdAt: "desc" },
  });

  // Transactional approvals
  const maybePrisma: any = prisma as any;
  const txnApprovals = maybePrisma.transactionalApproval?.findMany
    ? await maybePrisma.transactionalApproval.findMany({
        where: {
          companyId,
          status: status as any,
          ...(scope === "my" ? { approverIds: { has: approverId } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take,
      })
    : [];

  const items = [
    ...leaveDecisions.map((d) => {
      const user = d.stage.leaveRequest.Employee.User as any;
      const displayName = (user?.name && user.name.trim()) || `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || user?.email || "Employee";
      const type = d.stage.leaveRequest.EventCategory?.name ?? "Leave";
      const start = new Date(d.stage.leaveRequest.startDate);
      const end = new Date(d.stage.leaveRequest.endDate);
      return {
        id: d.id,
        type: "LEAVE" as const,
        title: `${displayName} — ${type}`,
        subtitle: `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
        // New fields used by dashboard modal for richer context
        leaveRequestId: d.stage.leaveRequestId,
        employee: { name: displayName, userId: user?.id ?? null, profileImageUrl: user?.profileImageUrl ?? null },
        dates: `${start.toLocaleDateString()} → ${end.toLocaleDateString()}`,
        typeName: type,
        source: "leave" as const,
      };
    }),
    ...txnApprovals.map((t: any) => ({
      id: t.id,
      type: "TRANSACTIONAL" as const,
      title: t.title ?? "Transactional change",
      subtitle: t.subtitle ?? undefined,
    })),
  ];

  return NextResponse.json({ items });
}


