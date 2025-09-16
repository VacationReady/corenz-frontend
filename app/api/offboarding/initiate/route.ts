import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { toUTCFromLondon } from "@/lib/time";
import {
  generateCompletionToken,
  sendExitInterviewConfirmation,
} from "@/lib/email/send";

// Validation schema
const initiateSchema = z.object({
  employeeId: z.string().min(1),
  exitInterviewDate: z.string().optional(), // YYYY-MM-DD
  exitInterviewTime: z.string().optional(), // HH:mm
  exitInterviewDuration: z
    .number()
    .int()
    .min(10)
    .max(60)
    .refine((n) => n % 10 === 0, {
      message: "Duration must be in 10-minute increments",
    })
    .optional(),
  interviewerUserId: z.string().optional(),
  interviewerName: z.string().optional(),
  interviewerEmail: z.string().email().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  sendForm: z.boolean().default(false),
  formTemplateId: z.string().optional(),
  formTiming: z.enum(["NOW", "ON_DATE"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin/manager role
    if (!["ADMIN", "MANAGER"].includes((session.user as any).role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const validatedData = initiateSchema.parse(body);

    const {
      employeeId,
      exitInterviewDate,
      exitInterviewTime,
      exitInterviewDuration,
      interviewerUserId,
      interviewerName,
      interviewerEmail,
      location,
      notes,
      sendForm,
      formTemplateId,
      formTiming,
    } = validatedData;

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true, offboardingRecord: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    if (employee.offboardingRecord) {
      return NextResponse.json(
        { error: "Employee is already being offboarded" },
        { status: 400 },
      );
    }

    // Validate interviewer information
    let interviewerUserIdValid = interviewerUserId || null;
    let interviewerNameValid = interviewerName || null;
    let interviewerEmailValid = interviewerEmail || null;

    if (interviewerUserId) {
      const interviewer = await prisma.user.findUnique({
        where: { id: interviewerUserId },
      });
      if (!interviewer) {
        return NextResponse.json(
          { error: "Interviewer not found" },
          { status: 400 },
        );
      }
      interviewerNameValid = `${interviewer.firstName} ${interviewer.lastName}`;
      interviewerEmailValid = interviewer.email;
    } else if (!interviewerName || !interviewerEmail) {
      return NextResponse.json(
        { error: "Interviewer information is required" },
        { status: 400 },
      );
    }

    // Convert date and time to UTC
    let exitInterviewDateUTC: Date | null = null;
    let exitInterviewEndUTC: Date | null = null;

    if (exitInterviewDate && exitInterviewTime) {
      exitInterviewDateUTC = toUTCFromLondon(
        exitInterviewDate,
        exitInterviewTime,
      );
      const duration = exitInterviewDuration ?? 60;
      exitInterviewEndUTC = new Date(
        exitInterviewDateUTC.getTime() + duration * 60 * 1000,
      );
    }

    // Validate form template if provided
    if (sendForm && formTemplateId) {
      const template = await prisma.exitInterviewFormTemplate.findUnique({
        where: { id: formTemplateId },
      });
      if (!template || !template.isActive) {
        return NextResponse.json(
          { error: "Invalid or inactive form template" },
          { status: 400 },
        );
      }
    }

    // Generate completion token if form is enabled
    let completionTokenHash: string | null = null;
    if (sendForm) {
      completionTokenHash = generateCompletionToken(employeeId);
    }

    // Calculate scheduled send time if ON_DATE
    let scheduledSendAt: Date | null = null;
    if (sendForm && formTiming === "ON_DATE" && exitInterviewDateUTC) {
      scheduledSendAt = exitInterviewDateUTC;
    }

    // Create or update offboarding record
    const offboardingData = {
      employeeId,
      initiatedById: session.user.id,
      status: "SCHEDULED" as const,
      offboardingType: "RESIGNATION" as const, // Default to resignation, can be made configurable later
      lastWorkingDate: new Date(), // Default to today, can be updated later
      exitInterviewDate: exitInterviewDateUTC,
      exitInterviewEnd: exitInterviewEndUTC,
      interviewerUserId: interviewerUserIdValid,
      interviewerName: interviewerNameValid,
      interviewerEmail: interviewerEmailValid,
      location: location ?? null,
      exitInterviewNotes: notes ?? null,
      sendForm,
      formTemplateId: sendForm ? (formTemplateId ?? null) : null,
      formTiming: sendForm ? (formTiming ?? null) : null,
      scheduledSendAt,
      completionTokenHash,
      completionStatus: "PENDING" as const,
    };

    const offboarding = await prisma.employeeOffboarding.create({
      data: offboardingData,
      include: {
        employee: {
          include: { User: true },
        },
        interviewerUser: true,
        formTemplate: true,
      },
    });

    // Archive employee
    await prisma.employee.update({
      where: { id: employeeId },
      data: { isActive: false },
    });

    // Send immediate confirmation if form timing is NOW
    let emailSent = false;
    if (sendForm && formTiming === "NOW") {
      emailSent = await sendExitInterviewConfirmation(offboarding.id);
    }

    return NextResponse.json({
      success: true,
      offboarding: {
        id: offboarding.id,
        status: offboarding.status,
        exitInterviewDate: offboarding.exitInterviewDate,
        sendForm: offboarding.sendForm,
        formTiming: offboarding.formTiming,
        emailSent,
      },
    });
  } catch (error) {
    console.error("Error initiating offboarding:", error);

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
        error: "Failed to initiate offboarding",
      },
      { status: 500 },
    );
  }
}
