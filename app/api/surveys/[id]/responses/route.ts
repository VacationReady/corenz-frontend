import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { getMobileSession } from "@/lib/mobile-session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";
import { anonymizeEmployeeData, getAnonymizationLevel } from "@/lib/survey-anonymization";

const submitResponseSchema = z.object({
  responseData: z.record(z.any()),
  actionItemId: z.string().optional(),
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

    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId: id },
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
      orderBy: { submittedAt: "desc" },
    });

    // Get anonymization level from survey metadata
    const anonymizationLevel = getAnonymizationLevel(survey.metadata);

    // Apply anonymization to responses
    const anonymizedResponses = responses.map(response => ({
      ...response,
      Employee: anonymizeEmployeeData(response.Employee, anonymizationLevel),
    }));

    return NextResponse.json({ 
      responses: anonymizedResponses,
      anonymizationLevel, // Include level so frontend knows what to expect
    });
  } catch (error) {
    console.error("Error fetching survey responses:", error);
    return NextResponse.json(
      { error: "Failed to fetch responses" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getMobileSession(request);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = submitResponseSchema.parse(body);

    // Get employee for the current user
    const employee = await prisma.employee.findFirst({
      where: {
        userId: session.user.id,
        companyId: session.user.companyId,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee record not found" },
        { status: 404 }
      );
    }

    // Verify survey exists and is active
    const survey = await prisma.survey.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
        status: "ACTIVE",
      },
    });

    if (!survey) {
      return NextResponse.json(
        { error: "Survey not found or not active" },
        { status: 404 }
      );
    }

    // Check if response already exists first to provide accurate error message
    const existingResponse = await prisma.surveyResponse.findUnique({
      where: {
        surveyId_employeeId: {
          surveyId: id,
          employeeId: employee.id,
        },
      },
    });

    if (existingResponse) {
      return NextResponse.json(
        { error: "You have already completed this survey" },
        { status: 400 }
      );
    }

    // Check if employee is a recipient (without status filter for better error messages)
    const recipient = await prisma.surveyRecipient.findFirst({
      where: {
        surveyId: id,
        employeeId: employee.id,
      },
    });

    if (!recipient) {
      return NextResponse.json(
        { error: "You are not a recipient of this survey" },
        { status: 403 }
      );
    }

    // Verify recipient hasn't already responded (double-check for race conditions)
    if (recipient.status === "RESPONDED" || recipient.status === "COMPLETED") {
      return NextResponse.json(
        { error: "You have already completed this survey" },
        { status: 400 }
      );
    }

    // Create response
    const response = await prisma.surveyResponse.create({
      data: {
        id: randomUUID(),
        surveyId: id,
        employeeId: employee.id,
        responseData: validatedData.responseData,
      },
    });

    // Update recipient status
    await prisma.surveyRecipient.update({
      where: { id: recipient.id },
      data: {
        status: "RESPONDED",
        respondedAt: new Date(),
      },
    });

    // Update survey response count - responseRate is computed on-the-fly in queries
    const surveyStats = await prisma.survey.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            SurveyResponses: true,
          },
        },
      },
    });

    if (surveyStats) {
      const totalResponses = surveyStats._count.SurveyResponses;

      await prisma.survey.update({
        where: { id },
        data: {
          responses: totalResponses,
        },
      });
    }

    // Mark action item as completed
    if (recipient.actionItemId) {
      await prisma.actionItem.update({
        where: { id: recipient.actionItemId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
    }

    // AI analysis temporarily disabled due to OpenAI package compatibility issues with Turbopack
    // TODO: Re-enable when OpenAI package is fixed or use a separate worker/queue for AI analysis
    // The survey response is saved successfully without AI analysis

    return NextResponse.json({ 
      response,
      message: "Response submitted successfully" 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error submitting response:", error);
    return NextResponse.json(
      { error: "Failed to submit response" },
      { status: 500 }
    );
  }
}
