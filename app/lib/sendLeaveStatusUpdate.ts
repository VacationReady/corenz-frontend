import { resend } from "./resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "./email/template";

interface LeaveStatusUpdateParams {
  to: string;
  subject: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  status: "APPROVED" | "DECLINED";
}

export async function sendLeaveStatusUpdate({
  to,
  subject,
  employeeName,
  type,
  startDate,
  endDate,
  status,
}: LeaveStatusUpdateParams) {
  try {
    const formattedStart = new Date(startDate).toLocaleDateString();
    const formattedEnd = new Date(endDate).toLocaleDateString();
    const baseUrl = getAppBaseUrl();

    const { html, text } = renderPeopleCoreEmail({
      preheader: `Your ${type} leave request is ${status.toLowerCase()}`,
      title: "Leave Request Update",
      intro: [
        `Hi ${employeeName},`,
        `Your leave request has been ${status.toLowerCase()}.`,
      ],
      sections: [
        {
          title: "Leave Details",
          description: [
            `Type: ${type}`,
            `Dates: ${formattedStart} to ${formattedEnd}`,
            `Status: ${status}`,
          ],
        },
      ],
      ctas: {
        label: "View Leave in PeopleCore",
        href: `${baseUrl}/profile`,
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

    console.log("✅ Leave status update email sent via Resend:", data);
    return data;
  } catch (error) {
    console.error("❌ Failed to send leave status update:", error);
  }
}

