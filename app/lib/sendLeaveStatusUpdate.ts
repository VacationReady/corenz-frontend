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
  comment?: string;
}

function formatDateDDMMYYYY(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export async function sendLeaveStatusUpdate({
  to,
  subject,
  employeeName,
  type,
  startDate,
  endDate,
  status,
  comment,
}: LeaveStatusUpdateParams) {
  try {
    const formattedStart = formatDateDDMMYYYY(startDate);
    const formattedEnd = formatDateDDMMYYYY(endDate);
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
        ...(status === "DECLINED" && comment
          ? [
              {
                title: "Manager's Comment",
                description: [comment],
              },
            ]
          : []),
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

