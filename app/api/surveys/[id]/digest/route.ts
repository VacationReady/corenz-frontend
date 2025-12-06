import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendSurveyDigest } from "@/lib/email/surveyDigest";

const digestSchema = z.object({
  recipients: z.array(z.string().email()),
  message: z.string().optional(),
  schedule: z.enum(["WEEKLY"]).optional().nullable(),
});

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
    const body = await request.json();
    const validatedData = digestSchema.parse(body);

    // Verify survey exists and belongs to company
    const survey = await prisma.survey.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
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
    });

    if (!survey) {
      return NextResponse.json(
        { error: "Survey not found" },
        { status: 404 }
      );
    }

    // Generate analytics data for the digest
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

    const analyticsData = {
      id: survey.id,
      name: survey.name,
      templateName: survey.Form.name,
      totalResponses,
      responseRate: Math.round(responseRate * 100) / 100,
      averageScore: averageScore ? Math.round(averageScore * 10) / 10 : undefined,
      keyInsights: survey.keyInsights || [],
      sentimentScore: survey.sentimentScore || 0.5,
      topThemes: survey.topThemes || [],
      completionDate: survey.deadline ?? survey.updatedAt,
    };

    // Send digest email
    try {
      await sendSurveyDigest({
        surveyAnalytics: analyticsData,
        recipients: validatedData.recipients.map(email => ({ email, name: email.split('@')[0] })),
        message: validatedData.message,
      });
    } catch (emailError) {
      console.error("Failed to send survey digest:", emailError);
      return NextResponse.json(
        { error: "Failed to send digest email" },
        { status: 500 }
      );
    }

    // Store scheduling preferences if requested
    let nextRunTimestamp = null;
    if (validatedData.schedule) {
      const currentMetadata = survey.metadata as any || {};
      const digestPreferences = {
        ...currentMetadata.digestPreferences,
        schedule: validatedData.schedule,
        recipients: validatedData.recipients,
        lastSent: new Date().toISOString(),
      };

      // Calculate next run time for weekly schedule
      if (validatedData.schedule === "WEEKLY") {
        const nextRun = new Date();
        nextRun.setDate(nextRun.getDate() + 7);
        nextRunTimestamp = nextRun.toISOString();
        digestPreferences.nextRun = nextRunTimestamp;
      }

      await prisma.survey.update({
        where: { id },
        data: {
          metadata: {
            ...currentMetadata,
            digestPreferences,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Digest sent to ${validatedData.recipients.length} recipients`,
      nextRun: nextRunTimestamp,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error sending survey digest:", error);
    return NextResponse.json(
      { error: "Failed to send digest" },
      { status: 500 }
    );
  }
}
