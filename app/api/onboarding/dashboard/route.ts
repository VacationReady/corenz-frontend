import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getOnboardingInsights } from "@/lib/onboarding/insights";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Scope by company if available
    const companyId = session.user.companyId || undefined;

    const insights = companyId
      ? await getOnboardingInsights(companyId)
      : null;

    if (!companyId) {
      const instances = await prisma.onboardingInstance.findMany({
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
        take: 50,
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

      return NextResponse.json({
        summary: {
          pending: items.filter((i) => i.status === "active").length,
          in_progress: items.filter((i) => i.status === "in_progress").length,
          overdue: 0,
        },
        items,
      });
    }

    return NextResponse.json({ success: true, data: insights });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

