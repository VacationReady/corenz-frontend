import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get surveys with completed status or responses
    const surveys = await prisma.survey.findMany({
      where: {
        companyId: session.user.companyId,
        OR: [
          { status: "COMPLETED" },
          { 
            SurveyResponses: {
              some: {}
            }
          }
        ]
      },
      include: {
        Form: {
          select: {
            name: true,
          },
        },
        SurveyResponses: {
          select: {
            id: true,
            responseData: true,
            submittedAt: true,
          },
        },
        _count: {
          select: {
            SurveyRecipients: true,
            SurveyResponses: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const analytics = surveys.map(survey => {
      const totalResponses = survey._count.SurveyResponses;
      const totalRecipients = survey._count.SurveyRecipients;
      const responseRate = totalRecipients > 0 ? (totalResponses / totalRecipients) * 100 : 0;

      // Calculate average score from response data if available
      let averageScore = survey.averageScore;
      if (!averageScore && survey.SurveyResponses.length > 0) {
        const scores = survey.SurveyResponses
          .map(response => {
            try {
              const data = response.responseData as any;
              // Look for numeric rating fields in response data
              const numericValues = Object.values(data || {})
                .filter(value => typeof value === 'number' && value >= 1 && value <= 5);
              return numericValues.length > 0 
                ? numericValues.reduce((sum: number, val: any) => sum + val, 0) / numericValues.length 
                : null;
            } catch {
              return null;
            }
          })
          .filter(score => score !== null) as number[];
        
        if (scores.length > 0) {
          averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        }
      }

      // Use completion date or latest response date
      const completionDate = survey.status === "COMPLETED" 
        ? (survey.deadline ?? survey.updatedAt)
        : survey.SurveyResponses.length > 0
          ? new Date(Math.max(...survey.SurveyResponses.map(r => new Date(r.submittedAt).getTime())))
          : survey.updatedAt;

      return {
        id: survey.id,
        name: survey.name,
        templateName: survey.Form.name,
        totalResponses,
        responseRate: Math.round(responseRate * 100) / 100,
        completionDate: completionDate.toISOString(),
        averageScore: averageScore ? Math.round(averageScore * 10) / 10 : undefined,
        keyInsights: survey.keyInsights || [],
        sentimentScore: survey.sentimentScore || 0.5,
        topThemes: survey.topThemes || [],
      };
    });

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error("Error fetching survey analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
