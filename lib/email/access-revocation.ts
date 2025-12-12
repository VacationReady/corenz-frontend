import { renderPeopleCoreEmail, getAppBaseUrl } from '../../app/lib/email/template';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface AccessRevocationEmailData {
  employeeName: string;
  employeeEmail: string;
  companyName?: string;
}

export async function sendAccessRevocationEmail(data: AccessRevocationEmailData): Promise<boolean> {
  const { employeeName, employeeEmail, companyName } = data;

  const { html, text } = renderPeopleCoreEmail({
    title: 'Access Removed',
    heroBadge: 'Account Update',
    heroSubtitle: 'Your PeopleCore access has been updated',
    intro: [`Hi ${employeeName},`],
    sections: [
      {
        description: [
          'We have removed your access to PeopleCore.',
          'If you need any documentation, final pay information, or have questions about your employment records, please contact HR directly.',
        ],
        highlight: true,
      },
      {
        title: 'Need Assistance?',
        description: [
          'Your HR team is available to help with any questions or requests you may have regarding your employment documentation.',
        ],
      },
    ],
    outro: [
      'Thank you for your time with us.',
      'We wish you all the best in your future endeavours.',
    ],
  });

  const fromAddress = process.env.EMAIL_FROM || 'PeopleCore <notifications@peoplecore.app>';
  const subject = 'Your PeopleCore Access Has Been Removed';

  if (!resend) {
    console.log('[access-revocation] Resend not configured, would send email:', {
      from: fromAddress,
      to: employeeEmail,
      subject,
    });
    return true;
  }

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: employeeEmail,
      subject,
      html,
      text,
    });

    console.log('[access-revocation] Email sent successfully:', {
      to: employeeEmail,
      id: result.data?.id,
    });
    return true;
  } catch (error) {
    console.error('[access-revocation] Failed to send email:', error);
    return false;
  }
}
