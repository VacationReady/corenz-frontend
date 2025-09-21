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
}

export async function sendLeaveNotification({
  to,
  subject,
  employeeName,
  type,
  startDate,
  endDate,
  status = "PENDING",
}: LeaveNotificationParams) {
  try {
    const formattedStart = new Date(startDate).toLocaleDateString();
    const formattedEnd = new Date(endDate).toLocaleDateString();
    const baseUrl = getAppBaseUrl();

    const { html, text } = renderPeopleCoreEmail({
      preheader: `${employeeName}'s ${type} leave is ${status.toLowerCase()}`,
      title: "Leave Request Notification",
      intro: [
        "Hello,",
        `This is a notification regarding ${employeeName}'s leave request.`,
      ],
      sections: [
        {
          title: "Leave Details",
          description: [
            `Employee: ${employeeName}`,
            `Type: ${type}`,
            `Dates: ${formattedStart} to ${formattedEnd}`,
            `Status: ${status}`,
          ],
        },
      ],
      ctas: {
        label: "Review Request",
        href: `${baseUrl}/dashboard/approvals`,
      },
      outro: [
        "PeopleCore HRIS System",
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

