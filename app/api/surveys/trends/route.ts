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

    // Get the last 12 months of data
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Get survey responses grouped by month
    const responsesByMonth = await prisma.$queryRaw<Array<{
      month: Date;
      responses: bigint;
    }>>`
      SELECT 
        DATE_TRUNC('month', "submittedAt") as month,
        COUNT(*) as responses
      FROM "SurveyResponse" sr
      JOIN "Survey" s ON sr."surveyId" = s.id
      WHERE s."companyId" = ${session.user.companyId}
        AND sr."submittedAt" >= ${twelveMonthsAgo}
      GROUP BY DATE_TRUNC('month', "submittedAt")
      ORDER BY month ASC
    `;

    // Get surveys with their response rates by month
    const surveysByMonth = await prisma.$queryRaw<Array<{
      month: Date;
      total_recipients: bigint;
      total_responses: bigint;
      avg_score: number | null;
    }>>`
      SELECT 
        DATE_TRUNC('month', s."sentDate") as month,
        SUM(s."totalRecipients") as total_recipients,
        SUM(s."responses") as total_responses,
        AVG(s."averageScore") as avg_score
      FROM "Survey" s
      WHERE s."companyId" = ${session.user.companyId}
        AND s."sentDate" >= ${twelveMonthsAgo}
        AND s."sentDate" IS NOT NULL
      GROUP BY DATE_TRUNC('month', s."sentDate")
      ORDER BY month ASC
    `;

    // Create a map of all months in the last 12 months
    const trends = [];
    const currentDate = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      
      // Find matching data for this month
      const responseData = responsesByMonth.find(r => 
        new Date(r.month).toISOString().slice(0, 7) === monthKey
      );
      const surveyData = surveysByMonth.find(s => 
        new Date(s.month).toISOString().slice(0, 7) === monthKey
      );

      const totalResponses = responseData ? Number(responseData.responses) : 0;
      const totalRecipients = surveyData ? Number(surveyData.total_recipients) : 0;
      const responseRate = totalRecipients > 0 ? (totalResponses / totalRecipients) * 100 : 0;
      const satisfactionScore = surveyData?.avg_score || 0;

      trends.push({
        period: monthKey,
        responseRate: Math.round(responseRate * 100) / 100,
        satisfactionScore: Math.round(satisfactionScore * 10) / 10,
        totalResponses,
      });
    }

    return NextResponse.json({ trends });
  } catch (error) {
    console.error("Error fetching survey trends:", error);
    return NextResponse.json(
      { error: "Failed to fetch trends" },
      { status: 500 }
    );
  }
}
