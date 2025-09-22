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

const HR_INBOX_FALLBACK = process.env.HR_INBOX_EMAIL;

function isValidEmail(value: string): boolean {
  return /.+@.+\..+/.test(value.trim());
}

function formatPersonName(
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    email?: string | null;
  } | null,
): string {
  if (!user) return "";
  const parts = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (parts) return parts;
  if (user.name) return user.name;
  return user.email ?? "";
}

function collectEmailsFromConfig(config: unknown): string[] {
  if (!config || typeof config !== "object") {
    return [];
  }

  const emails: string[] = [];
  const entries = Object.entries(config as Record<string, unknown>);

  for (const [key, value] of entries) {
    const loweredKey = key.toLowerCase();

    if (typeof value === "string") {
      if (
        isValidEmail(value) &&
        (loweredKey.includes("email") ||
          loweredKey.includes("recipient") ||
          loweredKey.includes("address") ||
          loweredKey.includes("inbox"))
      ) {
        emails.push(value.trim());
      }
    } else if (Array.isArray(value)) {
      if (
        loweredKey.includes("email") ||
        loweredKey.includes("recipient") ||
        loweredKey.includes("address") ||
        loweredKey.includes("inbox")
      ) {
        for (const entry of value) {
          if (typeof entry === "string" && isValidEmail(entry)) {
            emails.push(entry.trim());
          }
        }
      } else {
        for (const entry of value) {
          emails.push(...collectEmailsFromConfig(entry));
        }
      }
    } else if (typeof value === "object" && value) {
      emails.push(...collectEmailsFromConfig(value));
    }
  }

  return emails;
}

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

async function resolveHrContacts(companyId: string): Promise<string[]> {
  const hrEmails = new Set<string>();

  const notificationSettings = await prisma.notificationSettings.findUnique({
    where: { companyId },
  });

  if (notificationSettings) {
    // Email template configuration may explicitly store an HR inbox
    if (
      notificationSettings.emailTemplateConfig &&
      typeof notificationSettings.emailTemplateConfig === "object"
    ) {
      for (const email of collectEmailsFromConfig(
        notificationSettings.emailTemplateConfig,
      )) {
        if (isValidEmail(email)) {
          hrEmails.add(email);
        }
      }
    }

    // Digest recipients can act as a configured HR distribution list
    if (
      Array.isArray(notificationSettings.digestRecipients) &&
      notificationSettings.digestRecipients.length > 0
    ) {
      const digestUsers = await prisma.user.findMany({
        where: { id: { in: notificationSettings.digestRecipients } },
        select: { email: true },
      });

      for (const user of digestUsers) {
        if (user.email) {
          hrEmails.add(user.email);
        }
      }
    }

    // Default channel mapping (if configured for offboarding/HR)
    const defaultChannels =
      (notificationSettings.defaultChannels as
        | Record<string, string[]>
        | null
        | undefined) ?? {};
    const candidateChannelKeys = ["offboarding", "hr", "employee_offboarding"];

    const channelIds = candidateChannelKeys.flatMap((key) =>
      Array.isArray(defaultChannels[key]) ? defaultChannels[key]! : [],
    );

    if (channelIds.length > 0) {
      const channels = await prisma.notificationChannel.findMany({
        where: { id: { in: channelIds } },
      });

      for (const channel of channels) {
        if (channel.type !== "EMAIL") continue;

        for (const email of collectEmailsFromConfig(channel.config)) {
          if (isValidEmail(email)) {
            hrEmails.add(email);
          }
        }
      }
    }
  }

  if (hrEmails.size === 0 && HR_INBOX_FALLBACK && isValidEmail(HR_INBOX_FALLBACK)) {
    hrEmails.add(HR_INBOX_FALLBACK);
  }

  if (hrEmails.size === 0) {
    const admins = await prisma.user.findMany({
      where: {
        companyId,
        role: "ADMIN",
      },
      select: { email: true },
    });

    for (const admin of admins) {
      if (admin.email) {
        hrEmails.add(admin.email);
      }
    }
  }

  return Array.from(hrEmails);
}

export async function sendOffboardingCompletionSummaryEmail(
  offboardingId: string,
): Promise<boolean> {
  try {
    const offboarding = await prisma.employeeOffboarding.findUnique({
      where: { id: offboardingId },
      include: {
        Employee: {
          select: {
            companyId: true,
            User: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                name: true,
                managerId: true,
              },
            },
          },
        },
        User_EmployeeOffboarding_initiatedByIdToUser: {
          select: { firstName: true, lastName: true, name: true, email: true },
        },
        OffboardingTask: {
          include: {
            User_OffboardingTask_assignedToToUser: {
              select: {
                firstName: true,
                lastName: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!offboarding || !offboarding.Employee?.User) {
      throw new Error("Offboarding record not found for summary email");
    }

    const employeeUser = offboarding.Employee.User;
    const employeeName =
      formatPersonName(employeeUser) || employeeUser.email || "the employee";
    const companyId = offboarding.Employee.companyId;

    const recipients = new Set<string>();

    // Manager recipient
    let managerName = "";
    if (employeeUser.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: employeeUser.managerId },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          name: true,
        },
      });

      if (manager?.email) {
        recipients.add(manager.email);
      }
      managerName = formatPersonName(manager);
    }

    // HR recipients from configuration
    const hrEmails = await resolveHrContacts(companyId);
    for (const email of hrEmails) {
      if (isValidEmail(email)) {
        recipients.add(email);
      }
    }

    if (recipients.size === 0) {
      console.warn(
        "No recipients resolved for offboarding completion summary. Skipping email.",
      );
      return false;
    }

    const outstandingOptionalTasks = offboarding.OffboardingTask.filter(
      (task) => !task.isRequired && !task.completedAt,
    );

    const optionalTaskDetails = outstandingOptionalTasks.map((task) => {
      const assignee = formatPersonName(
        task.User_OffboardingTask_assignedToToUser,
      ) || "Unassigned";
      const dueDate = task.dueDate
        ? formatLondon(task.dueDate, "dd MMM yyyy")
        : "No due date";
      return `${task.title} — ${assignee} (Due ${dueDate})`;
    });

    const completionDate = offboarding.completedAt || new Date();
    const keyDates: Array<{ label: string; value: string }> = [];

    if (offboarding.resignationDate) {
      keyDates.push({
        label: "Resignation received",
        value: formatLondon(offboarding.resignationDate, "dd MMM yyyy"),
      });
    }
    if (offboarding.noticePeriodDays) {
      keyDates.push({
        label: "Notice period",
        value: `${offboarding.noticePeriodDays} days`,
      });
    }
    if (offboarding.lastWorkingDate) {
      keyDates.push({
        label: "Final working day",
        value: formatLondon(offboarding.lastWorkingDate, "dd MMM yyyy"),
      });
    }
    if (offboarding.actualLeaveDate) {
      keyDates.push({
        label: "Employment end",
        value: formatLondon(offboarding.actualLeaveDate, "dd MMM yyyy"),
      });
    }
    if (offboarding.benefitsEndDate) {
      keyDates.push({
        label: "Benefits end",
        value: formatLondon(offboarding.benefitsEndDate, "dd MMM yyyy"),
      });
    }
    if (offboarding.exitInterviewDate) {
      keyDates.push({
        label: "Exit interview",
        value: `${formatLondon(offboarding.exitInterviewDate, "dd MMM yyyy")}`,
      });
    }

    const keyDatesHtml = keyDates.length
      ? `<table style="width: 100%; border-collapse: collapse;">
          <tbody>
            ${keyDates
              .map(
                (date) => `
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #0f172a; width: 45%;">${date.label}</td>
                    <td style="padding: 6px 0; color: #0f172a;">${date.value}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>`
      : "";

    const keyDatesText = keyDates.map((date) => `${date.label}: ${date.value}`);

    const optionalSection = outstandingOptionalTasks.length
      ? {
          title: "Outstanding Optional Tasks",
          description: optionalTaskDetails,
        }
      : {
          title: "Outstanding Optional Tasks",
          description: ["All optional tasks are complete."],
        };

    const introGreeting = managerName
      ? `Hi ${managerName},`
      : "Hello team,";

    const { html, text } = renderPeopleCoreEmail({
      preheader: `Offboarding complete for ${employeeName}`,
      title: `Offboarding Completed — ${employeeName}`,
      intro: [
        introGreeting,
        `${employeeName}'s required offboarding tasks are now complete. Here is the latest summary for your records.`,
      ],
      sections: [
        {
          title: "Completion Summary",
          description: [
            `Status: Completed`,
            `Completed on: ${formatLondon(completionDate, "dd MMM yyyy HH:mm")}`,
            ...(offboarding.User_EmployeeOffboarding_initiatedByIdToUser
              ? [
                  `Initiated by: ${formatPersonName(
                    offboarding.User_EmployeeOffboarding_initiatedByIdToUser,
                  )}`,
                ]
              : []),
          ],
        },
        keyDatesHtml
          ? {
              title: "Key Dates",
              html: keyDatesHtml,
              text: keyDatesText,
            }
          : undefined,
        optionalSection,
      ].filter(Boolean) as {
        title?: string;
        description?: string | string[];
        bulletPoints?: string[];
        html?: string;
        text?: string | string[];
      }[],
      outro: [
        "If any optional tasks remain outstanding, please ensure they are completed before the employee's final day.",
        "Thank you,",
        "The PeopleCore Team",
      ],
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.from(recipients),
      subject: `Offboarding Completed — ${employeeName}`,
      html,
      text,
    });

    return true;
  } catch (error) {
    console.error("Failed to send offboarding completion summary:", error);
    return false;
  }
}

