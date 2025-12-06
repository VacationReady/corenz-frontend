import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { sendSurveyReminder } from "@/lib/email/surveyNotification";

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

    // Verify survey exists and belongs to company
    const survey = await prisma.survey.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
        status: "ACTIVE",
      },
      include: {
        SurveyRecipients: {
          where: {
            status: "PENDING", // Only resend to those who haven't responded
          },
          include: {
            Employee: {
              include: {
                User: {
                  select: {
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!survey) {
      return NextResponse.json(
        { error: "Survey not found or not active" },
        { status: 404 }
      );
    }

    const pendingRecipients = survey.SurveyRecipients;

    if (pendingRecipients.length === 0) {
      return NextResponse.json(
        { error: "No pending recipients to resend to" },
        { status: 400 }
      );
    }

    // Send reminder emails
    try {
      const emailRecipients = pendingRecipients.map(recipient => ({
        email: recipient.Employee.User.email,
        name: `${recipient.Employee.User.firstName || ''} ${recipient.Employee.User.lastName || ''}`.trim(),
      }));

      const emailResult = await sendSurveyReminder({
        surveyName: survey.name,
        surveyId: survey.id,
        deadline: survey.deadline,
        recipients: emailRecipients,
      });

      // Update reminder count and timestamp for recipients
      await prisma.surveyRecipient.updateMany({
        where: {
          surveyId: id,
          status: "PENDING",
        },
        data: {
          reminderSentAt: new Date(),
          reminderCount: {
            increment: 1,
          },
        },
      });

      console.log(`Survey reminders sent to ${emailRecipients.length} recipients`);

      return NextResponse.json({
        success: true,
        recipients: emailRecipients.length,
        message: `Survey reminder sent to ${emailRecipients.length} employee${emailRecipients.length !== 1 ? 's' : ''}`,
        emailResult,
      });
    } catch (emailError) {
      console.error("Failed to send survey reminder emails:", emailError);
      return NextResponse.json(
        { error: "Failed to send reminder emails" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error resending survey:", error);
    return NextResponse.json(
      { error: "Failed to resend survey" },
      { status: 500 }
    );
  }
}
