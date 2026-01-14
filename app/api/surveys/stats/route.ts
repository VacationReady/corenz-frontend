import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const [
      totalSurveys,
      activeSurveys,
      completedSurveys,
      totalResponses,
      averageResponseRate,
      recentSurveys,
      responseTrends,
    ] = await Promise.all([
      // Total surveys
      prisma.survey.count({
        where: {
          companyId: session.user.companyId,
        },
      }),

      // Active surveys
      prisma.survey.count({
        where: {
          companyId: session.user.companyId,
          status: "ACTIVE",
        },
      }),

      // Completed surveys
      prisma.survey.count({
        where: {
          companyId: session.user.companyId,
          status: "COMPLETED",
        },
      }),

      // Total responses
      prisma.surveyResponse.count({
        where: {
          Survey: {
            companyId: session.user.companyId,
          },
          submittedAt: { gte: startDate },
        },
      }),

      // Average response rate
      prisma.survey.aggregate({
        where: {
          companyId: session.user.companyId,
        },
        _avg: {
          responseRate: true,
        },
      }),

      // Recent surveys
      prisma.survey.findMany({
        where: {
          companyId: session.user.companyId,
          createdAt: { gte: startDate },
        },
        include: {
          Form: true,
          _count: {
            select: {
              SurveyRecipients: true,
              SurveyResponses: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Response trends by month
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "submittedAt") as month,
          COUNT(*) as responses
        FROM "SurveyResponse" sr
        JOIN "Survey" s ON sr."surveyId" = s.id
        WHERE s."companyId" = ${session.user.companyId}
          AND sr."submittedAt" >= ${startDate}
        GROUP BY DATE_TRUNC('month', "submittedAt")
        ORDER BY month DESC
        LIMIT 12
      `,
    ]);

    // Calculate response rate for recent surveys
    const recentSurveysWithRate = recentSurveys.map(survey => ({
      ...survey,
      responseRate: survey._count.SurveyRecipients > 0 
        ? (survey._count.SurveyResponses / survey._count.SurveyRecipients) * 100 
        : 0,
    }));

    // Calculate accurate average response rate from all surveys with recipients
    const allSurveysForAverage = await prisma.survey.findMany({
      where: {
        companyId: session.user.companyId,
        totalRecipients: { gt: 0 },
      },
      select: {
        _count: {
          select: {
            SurveyRecipients: true,
            SurveyResponses: true,
          },
        },
      },
    });

    const calculatedAverageResponseRate = allSurveysForAverage.length > 0
      ? allSurveysForAverage.reduce((sum, survey) => {
          const rate = survey._count.SurveyRecipients > 0
            ? (survey._count.SurveyResponses / survey._count.SurveyRecipients) * 100
            : 0;
          return sum + rate;
        }, 0) / allSurveysForAverage.length
      : 0;

    // Calculate pending actions (surveys with low response rates or approaching deadline)
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const pendingActions = await prisma.survey.count({
      where: {
        companyId: session.user.companyId,
        status: "ACTIVE",
        OR: [
          {
            deadline: { lte: threeDaysFromNow },
          },
          {
            responseRate: { lt: 50 },
            totalRecipients: { gt: 0 },
          },
        ],
      },
    });

    return NextResponse.json({
      totalSurveys,
      activeSurveys,
      completedSurveys,
      totalResponses,
      averageResponseRate: calculatedAverageResponseRate,
      pendingActions,
      recentSurveys: recentSurveysWithRate,
      responseTrends,
    });
  } catch (error) {
    console.error("Error fetching survey stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch survey statistics" },
      { status: 500 }
    );
  }
}
