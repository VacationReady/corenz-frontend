import { prisma } from "@/lib/prisma";
import {
  buildExitInterviewConfirmationICS,
  buildExitInterviewCancellationICS,
} from "@/lib/calendar/ics";
import { formatLondon } from "@/lib/time";
import { createHash, randomBytes } from "crypto";
import { resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "./template";

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@peoplecore.co.nz";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

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
    const employeeName =
      `${employee.User.firstName ?? ""} ${employee.User.lastName ?? ""}`.trim() ||
      employee.User.email;
    const interviewerName =
      interviewer.name ||
      `${interviewer.firstName ?? ""} ${interviewer.lastName ?? ""}`.trim();

    const subject = `Exit Interview — ${employeeName} on ${interviewDate} at ${interviewTime}`;

    let formLink: string | null = null;
    if (
      offboarding.sendForm &&
      offboarding.formTiming === "NOW" &&
      offboarding.completionTokenHash
    ) {
      const baseUrl = getAppBaseUrl();
      formLink = `${baseUrl}/exit-interview/${offboarding.completionTokenHash}`;
    }

    const detailsHtml = `
      <table style="width: 100%; border-collapse: collapse;">
        <tbody>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">Date</td>
            <td style="padding: 8px 0; color: #0f172a;">${escapeHtml(interviewDate)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">Time</td>
            <td style="padding: 8px 0; color: #0f172a;">${escapeHtml(interviewTime)} (London)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">Location</td>
            <td style="padding: 8px 0; color: #0f172a;">${escapeHtml(location)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">Interviewer</td>
            <td style="padding: 8px 0; color: #0f172a;">${escapeHtml(interviewerName)}</td>
          </tr>
          ${
            offboarding.exitInterviewNotes
              ? `<tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #0f172a; vertical-align: top;">Notes</td>
                  <td style="padding: 8px 0; color: #0f172a; white-space: pre-line;">${escapeHtml(
                    offboarding.exitInterviewNotes,
                  )}</td>
                </tr>`
              : ""
          }
        </tbody>
      </table>
    `;

    const detailsText = [
      `Date: ${interviewDate}`,
      `Time: ${interviewTime} (London)`,
      `Location: ${location}`,
      `Interviewer: ${interviewerName}`,
    ];
    if (offboarding.exitInterviewNotes) {
      detailsText.push(`Notes: ${offboarding.exitInterviewNotes}`);
    }

    const { html: htmlContent, text } = renderPeopleCoreEmail({
      preheader: `Exit interview scheduled for ${employeeName} on ${interviewDate}`,
      title: "Exit Interview Confirmation",
      intro: [
        `Hi ${employeeName},`,
        "Your exit interview has been scheduled. The details are below.",
      ],
      sections: [
        {
          title: "Interview Details",
          html: detailsHtml,
          text: detailsText,
        },
        {
          description: [
            "A calendar invitation (.ics) has been attached to this email so you can add the interview to your diary.",
          ],
        },
      ],
      ctas: formLink
        ? {
            label: "Complete Exit Interview Form",
            href: formLink,
          }
        : undefined,
      outro: [
        "If you have any questions or need to reschedule, please contact your HR team.",
        "Thank you,",
        "The PeopleCore Team",
      ],
    });

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
      text,
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
      text,
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
    const employeeName =
      `${employee.User.firstName ?? ""} ${employee.User.lastName ?? ""}`.trim() ||
      employee.User.email;
    const baseUrl = getAppBaseUrl();
    const formLink = `${baseUrl}/exit-interview/${offboarding.completionTokenHash}`;
    const today = formatLondon(new Date(), "dd MMMM yyyy");

    const subject = `Please complete your Exit Interview — ${today}`;

    const { html, text } = renderPeopleCoreEmail({
      preheader: "Your exit interview form is ready to complete",
      title: "Exit Interview Form",
      intro: [
        `Hi ${employeeName},`,
        "As part of your exit process, please complete your exit interview form today.",
      ],
      sections: [
        {
          description: [
            "Your responses help us learn from your experience and continue improving the PeopleCore workplace.",
          ],
        },
      ],
      ctas: {
        label: "Complete Form Now",
        href: formLink,
      },
      outro: [
        "If you have any issues accessing the form, please contact your HR team.",
        "Thank you,",
        "The PeopleCore Team",
      ],
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: employee.User.email,
      subject,
      html,
      text,
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

    const employeeName =
      `${employee.User.firstName ?? ""} ${employee.User.lastName ?? ""}`.trim() ||
      employee.User.email;
    const subject = `Exit Interview Cancelled — ${employeeName}`;

    const { html: htmlContent, text } = renderPeopleCoreEmail({
      preheader: `Exit interview cancelled for ${employeeName}`,
      title: "Exit Interview Cancelled",
      intro: [
        `Hi ${employeeName},`,
        "Your scheduled exit interview has been cancelled.",
      ],
      sections: [
        {
          description: [
            "We've attached an updated calendar notice (.ics) so you can remove the interview from your diary.",
          ],
        },
      ],
      outro: [
        "If you have any questions, please contact your HR team.",
        "Thank you,",
        "The PeopleCore Team",
      ],
    });

    // Send cancellation to employee
    await resend.emails.send({
      from: FROM_EMAIL,
      to: employee.User.email,
      subject,
      html: htmlContent,
      text,
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
        text,
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

