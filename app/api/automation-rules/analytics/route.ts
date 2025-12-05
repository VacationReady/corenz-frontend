import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/automation-rules/analytics
 * Returns real-time analytics for workflow library and automation rules
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;

    // Get all automation rules for the company
    const rules = await prisma.automationRule.findMany({
      where: { companyId },
      include: {
        _count: {
          select: {
            AutomationExecution: true,
          },
        },
      },
    });

    // Get executions from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const executionsToday = await prisma.automationExecution.count({
      where: {
        companyId,
        triggeredAt: {
          gte: today,
        },
      },
    });

    // Get executions from last 30 days for trend data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentExecutions = await prisma.automationExecution.findMany({
      where: {
        companyId,
        triggeredAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        triggeredAt: true,
        status: true,
        durationMs: true,
      },
    });

    // Calculate success rate
    const successfulExecutions = recentExecutions.filter(
      (e) => e.status === "COMPLETED"
    ).length;
    const successRate = recentExecutions.length > 0
      ? (successfulExecutions / recentExecutions.length) * 100
      : 100;

    // Calculate average execution time
    const avgExecutionTime = recentExecutions.length > 0
      ? recentExecutions.reduce((acc, e) => acc + (e.durationMs || 0), 0) / recentExecutions.length
      : 0;

    // Calculate time saved (rough estimate: 5 minutes per execution)
    const totalExecutions = recentExecutions.length;
    const minutesSaved = totalExecutions * 5;
    const hoursSaved = Math.round((minutesSaved / 60) * 10) / 10;

    // Get template usage stats
    const templateIds = rules
      .filter((r) => r.templateId)
      .map((r) => r.templateId as string);
    
    const templateUsage = templateIds.reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topTemplates = Object.entries(templateUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, count]) => ({ templateId: id, usageCount: count }));

    // Get activation state for all templates
    const activationState = rules.reduce((acc, rule) => {
      if (rule.templateId) {
        if (!acc[rule.templateId]) {
          acc[rule.templateId] = { total: 0, active: 0 };
        }
        acc[rule.templateId].total++;
        if (rule.isActive) {
          acc[rule.templateId].active++;
        }
      }
      return acc;
    }, {} as Record<string, { total: number; active: number }>);

    return NextResponse.json({
      totalWorkflows: rules.length,
      activeWorkflows: rules.filter((r) => r.isActive).length,
      executionsToday,
      timeSaved: `${hoursSaved} hrs`,
      successRate: Math.round(successRate),
      avgExecutionTimeMs: Math.round(avgExecutionTime),
      topTemplates,
      activationState,
      trendsLast30Days: {
        totalExecutions: recentExecutions.length,
        successfulExecutions,
        failedExecutions: recentExecutions.length - successfulExecutions,
      },
    });
  } catch (error) {
    console.error("Error fetching workflow analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
