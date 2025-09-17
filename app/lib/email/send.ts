import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import {
  buildExitInterviewConfirmationICS,
  buildExitInterviewCancellationICS,
} from "@/lib/calendar/ics";
import { formatLondon } from "@/lib/time";
import { createHash, randomBytes } from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@peoplecore.co.nz";

export interface EmailRecipient {
  email: string;
  name: string;
}

/**
 * Generate a secure token for exit interview form access
 */
export function generateCompletionToken(offboardingId: string): string {
  const randomToken = randomBytes(32).toString("hex");
  const hash = createHash("sha256")
    .update(randomToken + offboardingId)
    .digest("hex");
  return hash;
}

/**
 * Send exit interview confirmation email with ICS attachment
 */
export async function sendExitInterviewConfirmation(
  offboardingId: string,
): Promise<boolean> {
  try {
    console.log("Sending exit interview confirmation for:", offboardingId);

    const offboarding = await prisma.employeeOffboarding.findUnique({
      where: { id: offboardingId },
      include: {
        Employee: {
          include: { User: true },
        },
        User_EmployeeOffboarding_interviewerUserIdToUser: true,
        ExitInterviewFormTemplate: true,
      },
    });

    if (!offboarding) {
      throw new Error("Offboarding record not found");
    }

    if (!offboarding.exitInterviewDate) {
      throw new Error("Exit interview date not set");
    }

    console.log("Offboarding found:", {
      id: offboarding.id,
      exitInterviewDate: offboarding.exitInterviewDate,
      employeeEmail: offboarding.Employee.User.email,
    });

    const employee = offboarding.Employee;
    const interviewer = offboarding.User_EmployeeOffboarding_interviewerUserIdToUser || {
      name: offboarding.interviewerName,
      email: offboarding.interviewerEmail,
      firstName: offboarding.interviewerName?.split(" ")[0] || "",
      lastName:
        offboarding.interviewerName?.split(" ").slice(1).join(" ") || "",
    };

    console.log("Interviewer data:", {
      hasInterviewerUser: !!offboarding.User_EmployeeOffboarding_interviewerUserIdToUser,
      interviewerName: interviewer.name,
      interviewerEmail: interviewer.email,
    });

    if (!interviewer.email) {
      throw new Error("Interviewer email is required");
    }

    // Generate ICS attachment
    const ics = buildExitInterviewConfirmationICS(
      offboarding,
      employee,
      interviewer,
    );

    // Prepare email content
    const interviewDate = formatLondon(
      offboarding.exitInterviewDate,
      "EEEE, dd MMMM yyyy",
    );
    const interviewTime = formatLondon(offboarding.exitInterviewDate, "HH:mm");
    const location = offboarding.location || "Online/Office";

    const subject = `Exit Interview — ${employee.User.firstName} ${employee.User.lastName} on ${interviewDate} at ${interviewTime}`;

    let formLink = "";
    if (
      offboarding.sendForm &&
      offboarding.formTiming === "NOW" &&
      offboarding.completionTokenHash
    ) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;
      formLink = `${baseUrl}/exit-interview/${offboarding.completionTokenHash}`;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Exit Interview Confirmation</h2>

        <p>Dear ${employee.User.firstName} ${employee.User.lastName},</p>

        <p>Your exit interview has been scheduled with the following details:</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Date:</strong> ${interviewDate}</p>
          <p><strong>Time:</strong> ${interviewTime}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>Interviewer:</strong> ${interviewer.name || `${interviewer.firstName} ${interviewer.lastName}`}</p>
          ${offboarding.exitInterviewNotes ? `<p><strong>Notes:</strong> ${offboarding.exitInterviewNotes}</p>` : ""}
        </div>
        
        <p>A calendar invitation has been attached to this email. Please add it to your calendar.</p>
        
        ${
          formLink
            ? `
          <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Exit Interview Form</strong></p>
            <p>Please complete your exit interview form before the interview:</p>
            <a href="${formLink}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Complete Form</a>
          </div>
        `
            : ""
        }
        
        <p>If you have any questions or need to reschedule, please contact HR.</p>
        
        <p>Best regards,<br>HR Team</p>
      </div>
    `;

    console.log("Sending email to employee:", {
      from: FROM_EMAIL,
      to: employee.User.email,
      subject: subject.substring(0, 50) + "...",
      hasAttachments: true,
    });

    // Send email to employee
    await resend.emails.send({
      from: FROM_EMAIL,
      to: employee.User.email,
      subject,
      html: htmlContent,
      attachments: [
        {
          filename: ics.filename,
          content: Buffer.from(ics.content),
          contentType: ics.mime,
        },
      ],
    });

    console.log("Employee email sent successfully");

    // Send copy to interviewer
    await resend.emails.send({
      from: FROM_EMAIL,
      to: interviewer.email,
      subject: `Copy: ${subject}`,
      html: htmlContent,
      attachments: [
        {
          filename: ics.filename,
          content: Buffer.from(ics.content),
          contentType: ics.mime,
        },
      ],
    });

    // Update offboarding record
    await prisma.employeeOffboarding.update({
      where: { id: offboardingId },
      data: {
        inviteLastSentAt: new Date(),
        inviteIcsUid: ics.filename
          .replace(".ics", "")
          .replace("exit-interview-", ""),
      },
    });

    return true;
  } catch (error) {
    console.error("Failed to send exit interview confirmation:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", {
      message: errorMessage,
      stack: errorStack,
    });
    return false;
  }
}

/**
 * Send exit interview form invitation (for scheduled sends)
 */
export async function sendExitInterviewFormInvite(
  offboardingId: string,
): Promise<boolean> {
  try {
    console.log("Sending form invitation for offboarding:", offboardingId);

    const offboarding = await prisma.employeeOffboarding.findUnique({
      where: { id: offboardingId },
      include: {
        Employee: {
          include: { User: true },
        },
        ExitInterviewFormTemplate: true,
      },
    });

    if (!offboarding) {
      throw new Error("Offboarding record not found");
    }

    if (!offboarding.sendForm) {
      throw new Error("Form sending not enabled for this offboarding");
    }

    if (!offboarding.completionTokenHash) {
      throw new Error(
        "Completion token not found - form may not be properly configured",
      );
    }

    console.log("Form invitation setup:", {
      employeeEmail: offboarding.Employee.User.email,
      hasToken: !!offboarding.completionTokenHash,
      formTiming: offboarding.formTiming,
    });

    const employee = offboarding.Employee;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;
    const formLink = `${baseUrl}/exit-interview/${offboarding.completionTokenHash}`;
    const today = formatLondon(new Date(), "dd MMMM yyyy");

    const subject = `Please complete your Exit Interview — ${today}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Exit Interview Form</h2>

        <p>Dear ${employee.User.firstName} ${employee.User.lastName},</p>

        <p>As part of your exit process, please complete your exit interview form today.</p>
        
        <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin-bottom: 15px;"><strong>Exit Interview Form</strong></p>
          <a href="${formLink}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Complete Form Now</a>
        </div>
        
        <p>This form will help us understand your experience and gather feedback for improvement.</p>
        
        <p>If you have any issues accessing the form, please contact HR.</p>
        
        <p>Best regards,<br>HR Team</p>
      </div>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: employee.User.email,
      subject,
      html: htmlContent,
    });

    // Update completion status to STARTED
    await prisma.employeeOffboarding.update({
      where: { id: offboardingId },
      data: {
        completionStatus: "STARTED",
      },
    });

    return true;
  } catch (error) {
    console.error("Failed to send exit interview form invite:", error);
    return false;
  }
}

/**
 * Send exit interview cancellation email with ICS cancellation
 */
export async function sendExitInterviewCancellation(
  offboardingId: string,
): Promise<boolean> {
  try {
    const offboarding = await prisma.employeeOffboarding.findUnique({
      where: { id: offboardingId },
      include: {
        Employee: {
          include: { User: true },
        },
        User_EmployeeOffboarding_interviewerUserIdToUser: true,
      },
    });

    if (!offboarding || !offboarding.inviteIcsUid) {
      throw new Error("Offboarding record not found or no ICS UID");
    }

    const employee = offboarding.Employee;
    const interviewer = offboarding.User_EmployeeOffboarding_interviewerUserIdToUser || {
      name: offboarding.interviewerName,
      email: offboarding.interviewerEmail,
      firstName: offboarding.interviewerName?.split(" ")[0] || "",
      lastName:
        offboarding.interviewerName?.split(" ").slice(1).join(" ") || "",
    };

    // Generate cancellation ICS
    const ics = buildExitInterviewCancellationICS(
      offboarding,
      employee,
      interviewer,
    );

    const subject = `Exit Interview Cancelled — ${employee.User.firstName} ${employee.User.lastName}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">Exit Interview Cancelled</h2>
        
        <p>Dear ${employee.User.firstName} ${employee.User.lastName},</p>
        
        <p>Your scheduled exit interview has been cancelled.</p>
        
        <p>A cancellation notice has been attached to this email to remove the event from your calendar.</p>
        
        <p>If you have any questions, please contact HR.</p>
        
        <p>Best regards,<br>HR Team</p>
      </div>
    `;

    // Send cancellation to employee
    await resend.emails.send({
      from: FROM_EMAIL,
      to: employee.User.email,
      subject,
      html: htmlContent,
      attachments: [
        {
          filename: ics.filename,
          content: Buffer.from(ics.content),
          contentType: ics.mime,
        },
      ],
    });

    // Send cancellation to interviewer
    if (interviewer.email) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: interviewer.email,
        subject: `Copy: ${subject}`,
        html: htmlContent,
        attachments: [
          {
            filename: ics.filename,
            content: Buffer.from(ics.content),
            contentType: ics.mime,
          },
        ],
      });
    }

    return true;
  } catch (error) {
    console.error("Failed to send exit interview cancellation:", error);
    return false;
  }
}

