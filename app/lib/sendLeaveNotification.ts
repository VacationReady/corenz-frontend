import { resend } from "./resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "./email/template";

interface LeaveNotificationParams {
  to: string;
  subject: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  status?: "APPROVED" | "DECLINED" | "PENDING";
  approverName?: string;
}

export async function sendLeaveNotification({
  to,
  subject,
  employeeName,
  type,
  startDate,
  endDate,
  status = "PENDING",
  approverName,
}: LeaveNotificationParams) {
  try {
    const formattedStart = new Date(startDate).toLocaleDateString();
    const formattedEnd = new Date(endDate).toLocaleDateString();
    const baseUrl = getAppBaseUrl();

    const { html, text } = renderPeopleCoreEmail({
      preheader: `${employeeName}'s ${type} leave is ${status.toLowerCase()}`,
      title: "Leave Request Notification",
      heroBadge: "Leave management",
      heroSubtitle: `${employeeName}'s ${type.toLowerCase()} leave details at a glance`,
      intro: [
        approverName ? `Hi ${approverName},` : "Hello,",
        `${employeeName} has submitted a ${type.toLowerCase()} leave request. Here's a quick summary to review before taking action.`,
      ],
      sections: [
        {
          eyebrow: "Request snapshot",
          title: "Leave Details",
          highlight: true,
          bulletPoints: [
            `Employee: ${employeeName}`,
            `Type: ${type}`,
            `Dates: ${formattedStart} to ${formattedEnd}`,
            `Status: ${status}`,
          ],
        },
        {
          description: [
            "Respond promptly so the employee can plan with confidence.",
            "You can manage this request and see supporting context from the approvals workspace.",
          ],
        },
      ],
      ctas: [
        {
          label: "Review request", // sentence case reads nicer in button
          href: `${baseUrl}/dashboard/approvals`,
        },
        {
          label: "Open PeopleCore",
          href: baseUrl,
        },
      ],
      outro: [
        "Ngā mihi nui,",
        "The PeopleCore team",
      ],
    });

    const data = await resend.emails.send({
      from: "PeopleCore Notifications <noreply@peoplecore.co.nz>",
      to,
      subject,
      html,
      text,
    });

    console.log("✅ Email sent via Resend:", data);
    return data;
  } catch (error) {
    console.error("❌ Failed to send leave notification:", error);
  }
}

