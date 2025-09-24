import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { exitInterviewSchema } from "./schema";
import {
  generateCompletionToken,
  sendExitInterviewConfirmation,
} from "@/lib/email/send";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ employeeId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = exitInterviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { employeeId } = await context.params;
    const companyId = session.user.companyId;
    const data = parsed.data;

    // Find the offboarding record for this employee
    const offboarding = await prisma.employeeOffboarding.findUnique({
      where: { employeeId },
      include: { Employee: true },
    });

    if (!offboarding) {
      return NextResponse.json(
        { error: "Offboarding not found" },
        { status: 404 },
      );
    }

    if (offboarding.Employee.companyId !== companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update the main offboarding record with exit interview details
    const scheduledDate = data.scheduledAt ? new Date(data.scheduledAt) : null;
    const duration = data.durationMinutes ?? 60;
    const exitInterviewEnd = scheduledDate
      ? new Date(scheduledDate.getTime() + duration * 60 * 1000)
      : null;

    // Validate interviewer exists if provided
    let validInterviewerId = null;
    if (data.interviewerId) {
      try {
        const interviewer = await prisma.user.findUnique({
          where: { id: data.interviewerId },
          select: { id: true, companyId: true },
        });
        if (interviewer) {
          if (interviewer.companyId !== companyId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          }
          validInterviewerId = data.interviewerId;
        } else {
          console.warn(
            `Interviewer with ID ${data.interviewerId} not found, setting to null`,
          );
        }
      } catch (error) {
        console.warn(
          `Error validating interviewer ID ${data.interviewerId}:`,
          error,
        );
      }
    }

    await prisma.employeeOffboarding.update({
      where: { id: offboarding.id },
      data: {
        exitInterviewDate: scheduledDate,
        exitInterviewEnd: exitInterviewEnd,
        interviewerUserId: validInterviewerId,
        location: data.location ?? null,
        exitInterviewNotes: data.notes ?? null,
      },
    });

    const exitInterview = await prisma.exitInterview.upsert({
      where: { offboardingId: offboarding.id },
      update: {
        scheduledAt: scheduledDate,
        interviewerId: data.interviewerId ?? null,
        location: data.location ?? null,
        notes: data.notes ?? null,
        completed: data.completed ?? undefined,
        updatedAt: new Date(),
      },
      create: {
        id: crypto.randomUUID(),
        offboardingId: offboarding.id,
        scheduledAt: scheduledDate,
        interviewerId: data.interviewerId ?? null,
        location: data.location ?? null,
        notes: data.notes ?? null,
        completed: data.completed ?? false,
        updatedAt: new Date(),
      },
    });

    // Update form invitation settings on the offboarding record when provided
    if (
      typeof data.sendForm !== "undefined" ||
      typeof data.formTemplateId !== "undefined" ||
      typeof data.formTiming !== "undefined"
    ) {
      if (data.sendForm) {
        if (!data.formTemplateId) {
          return NextResponse.json(
            { error: "formTemplateId is required when sendForm is true" },
            { status: 400 },
          );
        }
        const template = await prisma.exitInterviewFormTemplate.findUnique({
          where: { id: data.formTemplateId },
          select: { id: true, companyId: true },
        });
        if (!template) {
          return NextResponse.json(
            { error: "Form template not found" },
            { status: 400 },
          );
        }
        if (template.companyId && template.companyId !== companyId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      const updateData: any = {
        sendForm: data.sendForm ?? false,
        formTemplateId: data.sendForm ? (data.formTemplateId ?? null) : null,
        formTiming: data.sendForm ? (data.formTiming ?? null) : null,
      };

      if (data.sendForm) {
        if (!offboarding.completionTokenHash) {
          updateData.completionTokenHash = generateCompletionToken(
            offboarding.id,
          );
        }
        updateData.completionStatus = "PENDING";
        updateData.scheduledSendAt =
          data.formTiming === "ON_DATE" && data.scheduledAt
            ? new Date(data.scheduledAt)
            : data.formTiming === "NOW"
              ? new Date(Date.now() - 60000) // Set to 1 minute ago so it's definitely within today's range
              : null;
      } else {
        updateData.completionStatus = null;
        updateData.scheduledSendAt = null;
        updateData.completionTokenHash = null;
      }

      await prisma.employeeOffboarding.update({
        where: { id: offboarding.id },
        data: updateData,
      });
    }

    let interviewer = null;
    if (validInterviewerId) {
      const interviewerRecord = await prisma.user.findUnique({
        where: { id: validInterviewerId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          companyId: true,
        },
      });
      if (interviewerRecord?.companyId === companyId) {
        const { companyId: _interviewerCompanyId, ...rest } = interviewerRecord;
        interviewer = rest;
      }
    }

    // Send calendar invite if interview is scheduled
    let calendarInviteSent = false;
    if (scheduledDate) {
      try {
        calendarInviteSent = await sendExitInterviewConfirmation(
          offboarding.id,
        );
      } catch (error) {
        console.error("Failed to send calendar invite:", error);
      }
    }

    return NextResponse.json({
      exitInterview: { ...exitInterview, interviewer },
      calendarInviteSent,
    });
  } catch (error) {
    console.error("Error saving exit interview:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error stack:", errorStack);
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 },
    );
  }
}
