import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendNewsEmailProps {
  title: string;
  slug: string;
  recipients: string[];
}

export async function sendNewsEmail({
  title,
  slug,
  recipients,
}: SendNewsEmailProps) {
  if (!recipients.length) return;

  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: recipients,
      subject: "New News Post",
      html: `
        <h2>${title}</h2>
        <p>A new news post has been published.</p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/news/${slug}">View Post</a></p>
      `,
    });
  } catch (err) {
    console.error("Failed to send news email:", err);
  }
}
