import { resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "@/lib/email/template";

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
    const baseUrl = getAppBaseUrl();
    const { html, text } = renderPeopleCoreEmail({
      preheader: title,
      title: "New PeopleCore News",
      intro: [
        "Hi there,",
        "A new news post has been published on your PeopleCore portal.",
      ],
      sections: [
        {
          title: title,
          description: ["Catch up on the latest update from your organisation."],
        },
      ],
      ctas: {
        label: "View News Post",
        href: `${baseUrl}/news/${slug}`,
      },
      outro: [
        "You're receiving this update because you're subscribed to PeopleCore news alerts.",
      ],
    });

    await resend.emails.send({
      from: "noreply@peoplecore.co.nz",
      to: recipients,
      subject: "New News Post",
      html,
      text,
    });
  } catch (err) {
    console.error("Failed to send news email:", err);
  }
}

