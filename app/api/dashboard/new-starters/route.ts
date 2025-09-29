import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId") || undefined;

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        ...(departmentId ? { departmentId } : {}),
        startDate: { gte: thirtyDaysAgo, lte: now },
      },
      select: {
        id: true,
        userId: true,
        startDate: true,
        Department: { select: { name: true } },
        User: {
          select: {
            firstName: true,
            lastName: true,
            name: true,
            email: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    const employeeIds = employees.map((e) => e.id);
    const instances = employeeIds.length
      ? await prisma.onboardingInstance.findMany({
          where: { employeeId: { in: employeeIds } },
          include: { OnboardingStepInstance: true },
        })
      : [];
    const byEmployee: Record<string, any[]> = {};
    for (const inst of instances) {
      if (!byEmployee[inst.employeeId]) byEmployee[inst.employeeId] = [];
      byEmployee[inst.employeeId].push(inst);
    }

    const items = employees.map((e) => {
      const displayName =
        (e.User?.name && e.User.name.trim()) ||
        `${e.User?.firstName ?? ""} ${e.User?.lastName ?? ""}`.trim() ||
        e.User?.email ||
        "Employee";
      const candidate = (byEmployee[e.id] || [])
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
      if (candidate) {
        const total = candidate.OnboardingStepInstance.length || 0;
        const done = candidate.OnboardingStepInstance.filter((s: any) => s.status === "completed").length;
        const completed = candidate.status === "completed" || (total > 0 && done >= total);
        const percent = completed ? 100 : total > 0 ? Math.round((done / total) * 100) : 0;
        return {
          employeeId: e.id,
          userId: e.userId,
          name: displayName,
          email: e.User?.email ?? null,
          department: e.Department?.name ?? null,
          profileImageUrl: e.User?.profileImageUrl ?? null,
          startDate: e.startDate,
          onboarding: {
            status: completed ? "completed" : candidate.status || "in_progress",
            stepsCompleted: done,
            stepsTotal: total,
            percent,
          },
        };
      }
      return {
        employeeId: e.id,
        userId: e.userId,
        name: displayName,
        email: e.User?.email ?? null,
        department: e.Department?.name ?? null,
        profileImageUrl: e.User?.profileImageUrl ?? null,
        startDate: e.startDate,
        onboarding: {
          status: "not_started",
          stepsCompleted: 0,
          stepsTotal: 0,
          percent: 0,
        },
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[DASHBOARD_NEW_STARTERS]", error);
    return NextResponse.json({ error: "Failed to fetch new starters" }, { status: 500 });
  }
}


