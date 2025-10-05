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
    const emailRecipients = recipients.map((r) => r.email);

    // Build deadline text
    const deadlineText = deadline
      ? `Please complete this survey by ${new Date(deadline).toLocaleDateString("en-NZ", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}.`
      : "Please complete this survey at your earliest convenience.";

    const { html, text } = renderPeopleCoreEmail({
      preheader: `You have a new survey to complete: ${surveyName}`,
      title: "New Survey Available",
      intro: [
        "Hi there,",
        "You've been assigned a new survey to complete.",
      ],
      sections: [
        {
          title: surveyName,
          description: surveyDescription
            ? [surveyDescription, deadlineText]
            : [deadlineText],
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
      to: emailRecipients,
      subject: `New Survey: ${surveyName}`,
      html,
      text,
    });

    console.log(`Survey notification sent to ${emailRecipients.length} recipients`);
    return { success: true, sent: emailRecipients.length };
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
    const emailRecipients = recipients.map((r) => r.email);

    // Build deadline urgency text
    const deadlineText = deadline
      ? `This survey is due ${new Date(deadline).toLocaleDateString("en-NZ", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}.`
      : "This survey is still awaiting your response.";

    const { html, text } = renderPeopleCoreEmail({
      preheader: `Reminder: Please complete the survey "${surveyName}"`,
      title: "Survey Reminder",
      intro: [
        "Hi there,",
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
      to: emailRecipients,
      subject: `Reminder: ${surveyName}`,
      html,
      text,
    });

    console.log(`Survey reminder sent to ${emailRecipients.length} recipients`);
    return { success: true, sent: emailRecipients.length };
  } catch (err) {
    console.error("Failed to send survey reminder email:", err);
    return { success: false, sent: 0, error: err };
  }
}
