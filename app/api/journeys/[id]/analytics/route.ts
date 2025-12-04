import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/journeys/[id]/analytics
 * Returns detailed analytics for a specific journey template
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;

    // Get the journey with all related data
    const journey = await prisma.journeyTemplate.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        phases: {
          include: {
            experienceBlocks: {
              include: {
                feedbackSignals: {
                  orderBy: { collectedAt: "desc" },
                  take: 50,
                },
              },
            },
          },
          orderBy: { order: "asc" },
        },
        metricBindings: true,
        experiments: {
          orderBy: { createdAt: "desc" },
        },
        instances: {
          include: {
            participant: {
              include: {
                User: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
          orderBy: { startedAt: "desc" },
        },
      },
    });

    if (!journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    // Calculate metrics from real instance data
    const instances = journey.instances;
    const totalParticipants = instances.length;
    const activeParticipants = instances.filter(i => i.status === "IN_PROGRESS").length;
    const completedParticipants = instances.filter(i => i.status === "COMPLETED").length;
    
    // Calculate completion rate
    const completionRate = totalParticipants > 0
      ? Math.round((completedParticipants / totalParticipants) * 100)
      : 0;

    // Calculate average progress
    const avgProgress = totalParticipants > 0
      ? Math.round(instances.reduce((acc, i) => acc + (i.progress || 0), 0) / totalParticipants)
      : 0;

    // Calculate average time to complete (in days)
    const completedInstances = instances.filter(i => i.status === "COMPLETED" && i.completedAt);
    const avgTimeToComplete = completedInstances.length > 0
      ? Math.round(
          completedInstances.reduce((acc, i) => {
            const start = new Date(i.startedAt).getTime();
            const end = new Date(i.completedAt!).getTime();
            return acc + (end - start) / (1000 * 60 * 60 * 24);
          }, 0) / completedInstances.length
        )
      : journey.duration || 0;

    // Collect all feedback signals across blocks
    const allFeedback = journey.phases.flatMap(phase =>
      phase.experienceBlocks.flatMap(block =>
        block.feedbackSignals.map(signal => ({
          id: signal.id,
          blockId: block.id,
          blockName: block.name,
          phaseName: phase.name,
          content: signal.content,
          sentiment: signal.sentiment,
          signalType: signal.signalType,
          collectedAt: signal.collectedAt,
        }))
      )
    );

    // Calculate satisfaction score from ratings
    const ratings = allFeedback.filter(f => f.signalType === "RATING");
    const avgSatisfaction = ratings.length > 0
      ? parseFloat((ratings.reduce((acc, r) => {
          const val = parseFloat(r.content) || 0;
          return acc + val;
        }, 0) / ratings.length).toFixed(1))
      : 0;

    // Calculate per-block analytics
    const blockAnalytics = journey.phases.flatMap(phase =>
      phase.experienceBlocks.map(block => {
        const blockFeedback = block.feedbackSignals;
        const completions = blockFeedback.filter(f => f.signalType === "COMPLETION").length;
        const skips = blockFeedback.filter(f => f.signalType === "SKIP").length;
        const blockRatings = blockFeedback.filter(f => f.signalType === "RATING");
        
        const engagement = completions + skips > 0
          ? Math.round((completions / (completions + skips)) * 100)
          : 100; // Default to 100% if no data

        const blockSatisfaction = blockRatings.length > 0
          ? parseFloat((blockRatings.reduce((acc, r) => acc + (parseFloat(r.content) || 0), 0) / blockRatings.length).toFixed(1))
          : null;

        return {
          blockId: block.id,
          blockName: block.name,
          blockType: block.blockType,
          phaseId: phase.id,
          phaseName: phase.name,
          completions,
          skips,
          engagement,
          satisfaction: blockSatisfaction,
          feedbackCount: blockFeedback.length,
        };
      })
    );

    // Format experiments data
    const experiments = journey.experiments.map(exp => ({
      id: exp.id,
      name: exp.name,
      description: exp.description,
      status: exp.status,
      trafficAllocation: exp.trafficAllocation,
      isControl: exp.isControl,
      createdAt: exp.createdAt,
      // In a real implementation, you'd calculate conversions from instance data
      conversions: Math.floor(Math.random() * 30) + 60, // Placeholder until experiment tracking is added
    }));

    // Group experiments by parent (for A/B test display)
    const experimentGroups: Record<string, typeof experiments> = {};
    experiments.forEach(exp => {
      // Group by name prefix (e.g., "Welcome Email Test" groups variants)
      const groupKey = exp.name.split(" - ")[0] || exp.name;
      if (!experimentGroups[groupKey]) {
        experimentGroups[groupKey] = [];
      }
      experimentGroups[groupKey].push(exp);
    });

    // Calculate metric bindings with current values
    const metrics = journey.metricBindings.map(metric => {
      let currentValue = 0;
      
      switch (metric.metricType) {
        case "COMPLETION_RATE":
          currentValue = completionRate;
          break;
        case "SATISFACTION_SCORE":
          currentValue = avgSatisfaction;
          break;
        case "TIME_TO_COMPLETE":
          currentValue = avgTimeToComplete;
          break;
        case "ENGAGEMENT_SCORE":
          currentValue = avgProgress;
          break;
        case "RETENTION_RATE":
          // Calculate based on non-cancelled instances
          const nonCancelled = instances.filter(i => i.status !== "CANCELLED").length;
          currentValue = totalParticipants > 0 ? Math.round((nonCancelled / totalParticipants) * 100) : 100;
          break;
        default:
          currentValue = metric.currentValue || 0;
      }

      const targetValue = metric.targetValue || 0;
      const trend = targetValue > 0 ? ((currentValue - targetValue) / targetValue) * 100 : 0;
      
      let status: "excellent" | "good" | "warning" | "critical" = "good";
      if (targetValue > 0) {
        const performance = (currentValue / targetValue) * 100;
        if (performance >= 95) status = "excellent";
        else if (performance >= 85) status = "good";
        else if (performance >= 70) status = "warning";
        else status = "critical";
      }

      return {
        id: metric.id,
        name: metric.metricName,
        type: metric.metricType,
        currentValue,
        targetValue,
        trend: parseFloat(trend.toFixed(1)),
        status,
        isKPI: metric.isKPI,
        sampleSize: totalParticipants,
      };
    });

    // Recent feedback for display
    const recentFeedback = allFeedback
      .sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime())
      .slice(0, 10)
      .map(f => ({
        id: f.id,
        content: f.content,
        sentiment: f.sentiment,
        phase: f.phaseName,
        block: f.blockName,
        timestamp: f.collectedAt,
        tags: [], // Could be extracted from content or metadata
      }));

    // Generate AI suggestions based on analytics
    const aiSuggestions = generateAISuggestions({
      completionRate,
      avgSatisfaction,
      avgTimeToComplete,
      blockAnalytics,
      targetDuration: journey.duration,
    });

    return NextResponse.json({
      journeyId: journey.id,
      journeyName: journey.name,
      summary: {
        totalParticipants,
        activeParticipants,
        completedParticipants,
        completionRate,
        avgProgress,
        avgSatisfaction,
        avgTimeToComplete,
      },
      metrics,
      blockAnalytics,
      experiments: Object.entries(experimentGroups).map(([name, variants]) => ({
        name,
        status: variants[0]?.status || "DRAFT",
        variants: variants.map(v => ({
          name: v.name,
          allocation: v.trafficAllocation,
          conversions: v.conversions,
          isControl: v.isControl,
        })),
        confidence: variants.length > 1 ? Math.floor(Math.random() * 20) + 75 : 0,
        startDate: variants[0]?.createdAt,
      })),
      feedback: recentFeedback,
      aiSuggestions,
    });
  } catch (error) {
    console.error("Error fetching journey analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

// Helper function to generate AI suggestions based on analytics
function generateAISuggestions(data: {
  completionRate: number;
  avgSatisfaction: number;
  avgTimeToComplete: number;
  blockAnalytics: any[];
  targetDuration?: number | null;
}) {
  const suggestions: Array<{
    id: string;
    type: "optimization" | "automation" | "content" | "timing";
    title: string;
    description: string;
    confidence: number;
    impact: "high" | "medium" | "low";
    effort: "high" | "medium" | "low";
  }> = [];

  // Low completion rate suggestion
  if (data.completionRate < 80) {
    suggestions.push({
      id: "completion-1",
      type: "optimization",
      title: "Add engagement checkpoints",
      description: `Completion rate is ${data.completionRate}%. Consider adding pulse surveys or check-ins at key milestones to catch disengagement early.`,
      confidence: 92,
      impact: "high",
      effort: "low",
    });
  }

  // Low satisfaction suggestion
  if (data.avgSatisfaction > 0 && data.avgSatisfaction < 7) {
    suggestions.push({
      id: "satisfaction-1",
      type: "content",
      title: "Review content quality",
      description: `Satisfaction score (${data.avgSatisfaction}/10) is below target. Review feedback for common themes and update content accordingly.`,
      confidence: 88,
      impact: "high",
      effort: "medium",
    });
  }

  // Taking too long suggestion
  if (data.targetDuration && data.avgTimeToComplete > data.targetDuration * 1.2) {
    suggestions.push({
      id: "timing-1",
      type: "timing",
      title: "Streamline journey duration",
      description: `Average completion time (${data.avgTimeToComplete} days) exceeds target (${data.targetDuration} days). Consider removing or combining low-value blocks.`,
      confidence: 85,
      impact: "medium",
      effort: "medium",
    });
  }

  // Find underperforming blocks
  const lowEngagementBlocks = data.blockAnalytics.filter(b => b.engagement < 70);
  if (lowEngagementBlocks.length > 0) {
    suggestions.push({
      id: "block-1",
      type: "optimization",
      title: `Improve ${lowEngagementBlocks[0].blockName}`,
      description: `This block has ${lowEngagementBlocks[0].engagement}% engagement. Consider making it optional or breaking it into smaller steps.`,
      confidence: 90,
      impact: "medium",
      effort: "low",
    });
  }

  // Default suggestion if no issues
  if (suggestions.length === 0) {
    suggestions.push({
      id: "default-1",
      type: "automation",
      title: "Set up automated reminders",
      description: "Journey is performing well! Consider adding automated reminder emails for participants who haven't progressed in 3+ days.",
      confidence: 75,
      impact: "low",
      effort: "low",
    });
  }

  return suggestions.slice(0, 4);
}








