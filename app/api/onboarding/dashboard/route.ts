import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Scope by company if available
    const companyId = session.user.companyId || undefined;

    const whereCompanyScoped = companyId
      ? { Employee: { companyId } as any }
      : {};

    const instances = await prisma.onboardingInstance.findMany({
      where: whereCompanyScoped,
      orderBy: { startedAt: "desc" },
      include: {
        OnboardingTemplate: { select: { name: true } },
        Employee: {
          include: {
            User: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        OnboardingStepInstance: true,
      },
    });

    const items = instances.map((inst) => {
      const stepsTotal = inst.OnboardingStepInstance.length;
      const stepsCompleted = inst.OnboardingStepInstance.filter(
        (s) => s.status === "completed",
      ).length;
      return {
        id: inst.id,
        status: inst.status,
        startedAt: inst.startedAt,
        completedAt: inst.completedAt,
        stepsTotal,
        stepsCompleted,
        template: inst.OnboardingTemplate,
        employee: inst.Employee,
      };
    });

    const summary = {
      pending: items.filter((i) => i.status === "active").length,
      in_progress: items.filter((i) => i.status === "in_progress").length,
      overdue: 0, // Could implement due dates; placeholder for now
    };

    return NextResponse.json({ summary, items });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

