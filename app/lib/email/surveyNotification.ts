import { resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "@/lib/email/template";

interface SendSurveyNotificationProps {
  surveyName: string;
  surveyDescription?: string;
  surveyId: string;
  deadline?: Date | null;
  recipients: Array<{
    email: string;
    name: string;
  }>;
}

export async function sendSurveyNotification({
  surveyName,
  surveyDescription,
  surveyId,
  deadline,
  recipients,
}: SendSurveyNotificationProps) {
  if (!recipients.length) {
    console.log("No recipients provided for survey notification");
    return { success: false, sent: 0 };
  }

  try {
    const baseUrl = getAppBaseUrl();

    // Build deadline text
    const deadlineText = deadline
      ? `Please complete this survey by ${new Date(deadline).toLocaleDateString("en-NZ", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}.`
      : "Please complete this survey at your earliest convenience.";

    let sentCount = 0;
    const errors: any[] = [];

    // Send individual emails to each recipient for personalization
    for (const recipient of recipients) {
      try {
        // Extract first name from full name
        const firstName = recipient.name.split(' ')[0] || recipient.name;
        const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

        const { html, text } = renderPeopleCoreEmail({
          preheader: `You have a new survey to complete: ${surveyName}`,
          title: "New Survey Available",
          intro: [
            greeting,
            "You've been assigned a new survey to complete.",
          ],
          sections: [
            {
              title: surveyName,
              description: [deadlineText],
            },
            {
              description: [
                "This survey has been added to your Action Items. You can complete it directly from your dashboard or by clicking the button below.",
              ],
            },
          ],
          ctas: {
            label: "Complete Survey",
            href: `${baseUrl}/dashboard`,
          },
          outro: [
            "Your feedback is important to us and helps improve our organization.",
            "This survey can be found in your Action Items on the dashboard.",
          ],
        });

        await resend.emails.send({
          from: "noreply@peoplecore.co.nz",
          to: recipient.email,
          subject: `New Survey: ${surveyName}`,
          html,
          text,
        });

        sentCount++;
      } catch (err) {
        console.error(`Failed to send survey notification to ${recipient.email}:`, err);
        errors.push({ email: recipient.email, error: err });
      }
    }

    console.log(`Survey notification sent to ${sentCount} of ${recipients.length} recipients`);
    return { success: sentCount > 0, sent: sentCount, errors: errors.length > 0 ? errors : undefined };
  } catch (err) {
    console.error("Failed to send survey notification email:", err);
    return { success: false, sent: 0, error: err };
  }
}

interface SendSurveyReminderProps {
  surveyName: string;
  surveyId: string;
  deadline?: Date | null;
  recipients: Array<{
    email: string;
    name: string;
  }>;
}

export async function sendSurveyReminder({
  surveyName,
  surveyId,
  deadline,
  recipients,
}: SendSurveyReminderProps) {
  if (!recipients.length) {
    console.log("No recipients provided for survey reminder");
    return { success: false, sent: 0 };
  }

  try {
    const baseUrl = getAppBaseUrl();

    // Build deadline urgency text
    const deadlineText = deadline
      ? `This survey is due ${new Date(deadline).toLocaleDateString("en-NZ", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}.`
      : "This survey is still awaiting your response.";

    let sentCount = 0;
    const errors: any[] = [];

    // Send individual emails to each recipient for personalization
    for (const recipient of recipients) {
      try {
        // Extract first name from full name
        const firstName = recipient.name.split(' ')[0] || recipient.name;
        const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

        const { html, text } = renderPeopleCoreEmail({
          preheader: `Reminder: Please complete the survey "${surveyName}"`,
          title: "Survey Reminder",
          intro: [
            greeting,
            "This is a friendly reminder to complete an outstanding survey.",
          ],
          sections: [
            {
              title: surveyName,
              description: [
                "You haven't completed this survey yet.",
                deadlineText,
              ],
            },
            {
              description: [
                "Your input is valuable and helps us improve our organization. Please take a few moments to share your feedback.",
              ],
            },
          ],
          ctas: {
            label: "Complete Survey Now",
            href: `${baseUrl}/dashboard`,
          },
          outro: [
            "This survey can be found in your Action Items on the dashboard.",
          ],
        });

        await resend.emails.send({
          from: "noreply@peoplecore.co.nz",
          to: recipient.email,
          subject: `Reminder: ${surveyName}`,
          html,
          text,
        });

        sentCount++;
      } catch (err) {
        console.error(`Failed to send survey reminder to ${recipient.email}:`, err);
        errors.push({ email: recipient.email, error: err });
      }
    }

    console.log(`Survey reminder sent to ${sentCount} of ${recipients.length} recipients`);
    return { success: sentCount > 0, sent: sentCount, errors: errors.length > 0 ? errors : undefined };
  } catch (err) {
    console.error("Failed to send survey reminder email:", err);
    return { success: false, sent: 0, error: err };
  }
}
