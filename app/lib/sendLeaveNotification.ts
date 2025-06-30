import { resend } from "./resend";

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

    const html = `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
        <h2 style="color: #111827;">CoreNZ Leave Notification</h2>
        <p>Hello,</p>
        <p>This is a notification regarding <strong>${employeeName}</strong>'s leave request:</p>
        <ul>
          <li><strong>Type:</strong> ${type}</li>
          <li><strong>Dates:</strong> ${formattedStart} to ${formattedEnd}</li>
          <li><strong>Status:</strong> ${status}</li>
        </ul>
        <p>
          <a 
            href="https://corenz.vercel.app/dashboard/approvals" 
            style="background-color:#1d4ed8;color:white;padding:10px 15px;text-decoration:none;border-radius:5px;display:inline-block;"
            target="_blank"
          >
            Click here to login and approve this request
          </a>
        </p>
        <br/>
        <p style="font-size: 12px; color: #6b7280;">CoreNZ HRIS System</p>
      </div>
    `;

    const data = await resend.emails.send({
      from: "CoreNZ Notifications <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    console.log("✅ Email sent via Resend:", data);
    return data;
  } catch (error) {
    console.error("❌ Failed to send leave notification:", error);
  }
}
