import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/journeys/analytics
 * Returns analytics for journey templates and instances
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;

    // Get all journey templates for the company
    const templates = await prisma.journeyTemplate.findMany({
      where: { companyId },
      include: {
        metricBindings: true,
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    // Calculate stats (simplified without instances for now)
    const totalTemplates = templates.length;
    const publishedTemplates = templates.filter(t => t.status === "PUBLISHED").length;
    const draftTemplates = templates.filter(t => t.status === "DRAFT").length;

    // Placeholder values - would integrate with actual instance tracking
    const totalInstances = 0;
    const activeInstances = 0;
    const completedInstances = 0;
    const avgCompletionRate = 0;

    // Get top performing journeys (based on templates for now)
    const topJourneys = templates
      .filter(t => t.status === "PUBLISHED")
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        name: t.name,
        instanceCount: 0,
        avgCompletionRate: 0,
        status: t.status,
      }));

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
        activeThisMonth: 0,
        completedThisMonth: 0,
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
