import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// The employee submits answers using only the token from their email link.
// The server derives the offboarding record from this token and associates
// the answers accordingly.
const submitSchema = z.object({
  token: z.string().min(1),
  answersJson: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, answersJson } = submitSchema.parse(body);

    // Locate the offboarding record using the supplied token
    const offboarding = await prisma.employeeOffboarding.findFirst({
      where: { completionTokenHash: token },
      include: {
        Employee: {
          include: { User: true },
        },
        formTemplate: true,
      },
    });

    if (!offboarding) {
      return NextResponse.json(
        { error: "Offboarding record not found" },
        { status: 404 },
      );
    }

    // Check if already submitted
    if (offboarding.completionStatus === "SUBMITTED") {
      return NextResponse.json(
        { error: "Form already submitted" },
        { status: 400 },
      );
    }

    // Check if form template exists
    if (!offboarding.formTemplateId) {
      return NextResponse.json(
        { error: "No form template assigned" },
        { status: 400 },
      );
    }

    // Create submission record
    const submission = await prisma.exitInterviewSubmission.create({
      data: {
        offboardingId: offboarding.id,
        templateId: offboarding.formTemplateId,
        submittedBy: offboarding.employee.user.email,
        submittedAt: new Date(),
        answersJson: answersJson || {},
      },
    });

    // Update offboarding completion status
    await prisma.employeeOffboarding.update({
      where: { id: offboarding.id },
      data: {
        completionStatus: "SUBMITTED",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Exit interview form submitted successfully",
      submissionId: submission.id,
    });
  } catch (error) {
    console.error("Error submitting exit interview form:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to submit form",
      },
      { status: 500 },
    );
  }
}

