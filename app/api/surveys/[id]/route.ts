import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { anonymizeEmployeeData, getAnonymizationLevel } from "@/lib/survey-anonymization";

const updateSurveySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "EXPIRED"]).optional(),
  deadline: z.string().datetime().optional(),
  averageScore: z.number().optional(),
  sentimentScore: z.number().optional(),
  keyInsights: z.array(z.string()).optional(),
  topThemes: z.array(z.string()).optional(),
});

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
    const { searchParams } = new URL(request.url);
    
    // Allow admins to view full details without anonymization
    const includeFullDetails = searchParams.get("includeFullDetails") === "true";

    const survey = await prisma.survey.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
      include: {
        Form: true,
        CreatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        SurveyRecipients: {
          include: {
            Employee: {
              select: {
                id: true,
                User: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
                Department: {
                  select: {
                    name: true,
                  },
                },
                JobRole: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        SurveyResponses: {
          include: {
            Employee: {
              select: {
                id: true,
                User: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
                Department: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { submittedAt: "desc" },
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

    // Get anonymization level from survey metadata
    // When admin is viewing from dashboard, allow bypassing anonymization
    const anonymizationLevel = includeFullDetails 
      ? "public" as const
      : getAnonymizationLevel(survey.metadata);

    // Prepare survey data with computed fields
    const surveyData = {
      ...survey,
      totalRecipients: survey._count.SurveyRecipients,
      responses: survey._count.SurveyResponses,
      responseRate: survey._count.SurveyRecipients > 0 
        ? (survey._count.SurveyResponses / survey._count.SurveyRecipients) * 100 
        : 0,
      // Include anonymization level so frontend can display privacy info
      anonymizationLevel: getAnonymizationLevel(survey.metadata),
      // When includeFullDetails is true, return raw employee data for admin view
      // Otherwise apply anonymization as normal
      SurveyResponses: includeFullDetails 
        ? survey.SurveyResponses
        : survey.SurveyResponses.map(response => ({
            ...response,
            Employee: anonymizeEmployeeData(response.Employee, anonymizationLevel),
          })),
      SurveyRecipients: includeFullDetails
        ? survey.SurveyRecipients
        : survey.SurveyRecipients.map(recipient => ({
            ...recipient,
            Employee: anonymizeEmployeeData(recipient.Employee, anonymizationLevel),
          })),
    };

    return NextResponse.json(surveyData);
  } catch (error) {
    console.error("Error fetching survey:", error);
    return NextResponse.json(
      { error: "Failed to fetch survey" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const validatedData = updateSurveySchema.parse(body);

    // Verify survey exists and belongs to company
    const existingSurvey = await prisma.survey.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
    });

    if (!existingSurvey) {
      return NextResponse.json(
        { error: "Survey not found" },
        { status: 404 }
      );
    }

    const updateData: any = {
      ...validatedData,
      updatedAt: new Date(),
    };

    if (validatedData.deadline) {
      updateData.deadline = new Date(validatedData.deadline);
    }

    const survey = await prisma.survey.update({
      where: { id },
      data: updateData,
      include: {
        Form: true,
        CreatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(survey);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating survey:", error);
    return NextResponse.json(
      { error: "Failed to update survey" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify survey exists and belongs to company
    const survey = await prisma.survey.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
    });

    if (!survey) {
      return NextResponse.json(
        { error: "Survey not found" },
        { status: 404 }
      );
    }

    // Check if survey has responses
    const responseCount = await prisma.surveyResponse.count({
      where: { surveyId: id },
    });

    if (responseCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete survey with responses" },
        { status: 400 }
      );
    }

    await prisma.survey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting survey:", error);
    return NextResponse.json(
      { error: "Failed to delete survey" },
      { status: 500 }
    );
  }
}
