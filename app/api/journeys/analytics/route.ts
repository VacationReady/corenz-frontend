import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/journeys/analytics
 * Returns analytics for journey templates and instances
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;

    // Get all journey templates for the company with instance counts
    const templates = await prisma.journeyTemplate.findMany({
      where: { companyId },
      include: {
        metricBindings: true,
        instances: {
          select: {
            id: true,
            status: true,
            progress: true,
            startedAt: true,
            completedAt: true,
          },
        },
        _count: {
          select: {
            comments: true,
            instances: true,
          },
        },
      },
    });

    // Calculate template stats
    const totalTemplates = templates.length;
    const publishedTemplates = templates.filter(t => t.status === "PUBLISHED").length;
    const draftTemplates = templates.filter(t => t.status === "DRAFT").length;

    // Calculate instance stats from actual data
    const allInstances = templates.flatMap(t => t.instances);
    const totalInstances = allInstances.length;
    const activeInstances = allInstances.filter(i => i.status === "IN_PROGRESS").length;
    const completedInstances = allInstances.filter(i => i.status === "COMPLETED").length;
    
    // Calculate average completion rate from completed instances
    const completedWithProgress = allInstances.filter(i => i.status === "COMPLETED");
    const avgCompletionRate = completedWithProgress.length > 0
      ? Math.round(completedWithProgress.reduce((acc, i) => acc + (i.progress || 100), 0) / completedWithProgress.length)
      : (activeInstances > 0 ? Math.round(allInstances.reduce((acc, i) => acc + (i.progress || 0), 0) / allInstances.length) : 0);

    // Get top performing journeys with real instance data
    const topJourneys = templates
      .filter(t => t.status === "PUBLISHED")
      .map(t => {
        const instanceCount = t._count.instances;
        const completed = t.instances.filter(i => i.status === "COMPLETED");
        const avgProgress = t.instances.length > 0
          ? Math.round(t.instances.reduce((acc, i) => acc + (i.progress || 0), 0) / t.instances.length)
          : 0;
        
        return {
          id: t.id,
          name: t.name,
          instanceCount,
          avgCompletionRate: avgProgress,
          completedCount: completed.length,
          status: t.status,
        };
      })
      .sort((a, b) => b.instanceCount - a.instanceCount)
      .slice(0, 5);

    // Get journey categories distribution
    const categoryDistribution = templates.reduce((acc, t) => {
      const category = t.category || "uncategorized";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTemplates = templates.filter(t => 
      new Date(t.createdAt) >= thirtyDaysAgo
    );

    const recentInstances = allInstances.filter(i => 
      new Date(i.startedAt) >= thirtyDaysAgo
    );

    const recentCompleted = allInstances.filter(i => 
      i.completedAt && new Date(i.completedAt) >= thirtyDaysAgo
    );

    return NextResponse.json({
      totalTemplates,
      publishedTemplates,
      draftTemplates,
      totalInstances,
      activeInstances,
      completedInstances,
      avgCompletionRate,
      topJourneys,
      categoryDistribution,
      recentActivity: {
        last30Days: recentTemplates.length,
        activeThisMonth: recentInstances.length,
        completedThisMonth: recentCompleted.length,
      },
    });
  } catch (error) {
    console.error("Error fetching journey analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
