import { renderPeopleCoreEmail, getAppBaseUrl } from '../../app/lib/email/template';
import { format } from 'date-fns';
import { resend } from '@/lib/resend';
import { env } from '@/lib/env.server';

const FROM_EMAIL = env.FROM_EMAIL;

interface TimesheetRejectionEmailData {
  to: string;
  employeeName: string;
  rejectedBy: string;
  reason: string;
  periodStart: Date;
  periodEnd: Date;
}

export async function sendTimesheetRejectionEmail(data: TimesheetRejectionEmailData) {
  const { to, employeeName, rejectedBy, reason, periodStart, periodEnd } = data;
  const baseUrl = getAppBaseUrl();

  const { html, text } = renderPeopleCoreEmail({
    preheader: 'Your timesheet has been declined and requires your attention',
    title: 'Timesheet Declined',
    intro: [
      `Hi ${employeeName},`,
      'Your timesheet has been declined and requires your attention.',
    ],
    sections: [
      {
        title: 'Decline Details',
        html: `
          <div style="background: #FEF2F2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6B7280;">Period:</td>
                <td style="padding: 8px 0; font-weight: 600;">${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d, yyyy')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280;">Declined by:</td>
                <td style="padding: 8px 0; font-weight: 600;">${rejectedBy}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280; vertical-align: top;">Reason:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #DC2626;">${reason}</td>
              </tr>
            </table>
          </div>
        `,
        text: [
          `Period: ${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d, yyyy')}`,
          `Declined by: ${rejectedBy}`,
          `Reason: ${reason}`,
        ],
      },
    ],
    ctas: {
      label: 'View Timesheet',
      href: `${baseUrl}/employee/timesheet`,
    },
    outro: [
      'Please review the feedback above and make any necessary corrections before resubmitting your timesheet.',
      'Thank you,',
      'The PeopleCore Team',
    ],
  });

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Timesheet Declined - Action Required',
    html,
    text,
  });
}
