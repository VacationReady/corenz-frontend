import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { triggerManualAnalysis } from "@/lib/ai/survey-analyzer";

/**
 * POST /api/surveys/[id]/analyze
 * Trigger AI analysis for a specific survey
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify survey exists and user has access
    const survey = await prisma.survey.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
      include: {
        _count: {
          select: {
            SurveyResponses: true,
          },
        },
      },
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    if (survey._count.SurveyResponses === 0) {
      return NextResponse.json(
        { error: "No responses found for analysis" },
        { status: 400 }
      );
    }

    // Trigger AI analysis
    const analysisResult = await triggerManualAnalysis(id);

    return NextResponse.json({
      success: true,
      message: "AI analysis completed successfully",
      analysis: analysisResult,
    });

  } catch (error) {
    console.error("Error in survey analysis:", error);
    return NextResponse.json(
      { error: "Failed to analyze survey responses" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/surveys/[id]/analyze
 * Get current analysis status for a survey
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get survey with current analysis
    const survey = await prisma.survey.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
      include: {
        _count: {
          select: {
            SurveyResponses: true,
          },
        },
      },
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    return NextResponse.json({
      hasAnalysis: !!(survey.keyInsights && survey.keyInsights.length > 0),
      responseCount: survey._count.SurveyResponses,
      lastAnalyzed: survey.updatedAt,
      keyInsights: survey.keyInsights || [],
      topThemes: survey.topThemes || [],
      sentimentScore: survey.sentimentScore,
      averageScore: survey.averageScore,
    });

  } catch (error) {
    console.error("Error getting survey analysis status:", error);
    return NextResponse.json(
      { error: "Failed to get analysis status" },
      { status: 500 }
    );
  }
}
