// import { resend } from '@/app/lib/resend'; // TODO: Implement email service
// import { renderPeopleCoreEmail, getAppBaseUrl } from '@/app/lib/email/template'; // TODO: Implement email templates
import { format, differenceInHours } from 'date-fns';

interface ShiftEmailData {
  id: string;
  startTime: Date;
  endTime: Date;
  breakDuration: number;
  notes?: string | null;
  role?: string | null;
  requiresConfirmation: boolean;
  location?: {
    name: string;
    address?: string | null;
  } | null;
}

interface EmployeeEmailData {
  name: string;
  email: string;
}

export async function sendShiftPublishedEmail(
  employee: EmployeeEmailData,
  shift: ShiftEmailData,
  companyId: string
) {
  const duration = differenceInHours(shift.endTime, shift.startTime);
  const netHours = duration - (shift.breakDuration / 60);

  const { html } = renderPeopleCoreEmail({
    title: 'New Shift Assignment',
    intro: `Hi ${employee.name},`,
    sections: [
      {
        description: 'You have been assigned a new shift:',
        html: `
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6B7280;">Date:</td>
                <td style="padding: 8px 0; font-weight: 600;">${format(shift.startTime, 'EEEE, MMMM d, yyyy')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280;">Time:</td>
                <td style="padding: 8px 0; font-weight: 600;">${format(shift.startTime, 'h:mm a')} - ${format(shift.endTime, 'h:mm a')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280;">Duration:</td>
                <td style="padding: 8px 0; font-weight: 600;">${netHours.toFixed(1)} hours (${shift.breakDuration} min break)</td>
              </tr>
              ${shift.role ? `
              <tr>
                <td style="padding: 8px 0; color: #6B7280;">Role:</td>
                <td style="padding: 8px 0; font-weight: 600;">${shift.role}</td>
              </tr>
              ` : ''}
              ${shift.location ? `
              <tr>
                <td style="padding: 8px 0; color: #6B7280;">Location:</td>
                <td style="padding: 8px 0; font-weight: 600;">${shift.location.name}</td>
              </tr>
              ${shift.location.address ? `
              <tr>
                <td style="padding: 8px 0; color: #6B7280;">Address:</td>
                <td style="padding: 8px 0;">${shift.location.address}</td>
              </tr>
              ` : ''}
              ` : ''}
              ${shift.notes ? `
              <tr>
                <td style="padding: 8px 0; color: #6B7280;">Notes:</td>
                <td style="padding: 8px 0;">${shift.notes}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          ${shift.requiresConfirmation ? `
            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400E;">
                <strong>⚠️ Confirmation Required</strong><br/>
                Please confirm your availability for this shift as soon as possible.
              </p>
            </div>
          ` : ''}
        `,
      },
    ],
    ctas: {
      label: 'View My Schedule',
      href: `${getAppBaseUrl()}/employee/schedule`,
    },
    outro: 'You will receive a reminder 1 hour before your shift starts.',
  });

  // TODO: Implement email service
  console.log('Would send email:', {
    from: 'PeopleCore <notifications@peoplecore.app>',
    to: employee.email,
    subject: '📅 New Shift Assignment',
    html,
  });
}

export async function sendShiftReminderEmail(
  employee: EmployeeEmailData,
  shift: ShiftEmailData,
  companyId: string
) {
  const { html } = renderPeopleCoreEmail({
    title: 'Shift Reminder',
    intro: [
      `Hi ${employee.name},`,
      '⏰ Your shift starts in 1 hour!',
    ],
    sections: [
      {
        html: `
          <div style="background: #DBEAFE; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
              ${format(shift.startTime, 'h:mm a')} - ${format(shift.endTime, 'h:mm a')}
            </p>
            ${shift.location ? `
              <p style="margin: 0; color: #1E40AF;">
                📍 ${shift.location.name}
              </p>
            ` : ''}
          </div>
        `,
      },
    ],
    ctas: {
      label: 'Clock In Now',
      href: `${getAppBaseUrl()}/employee/clock`,
    },
  });

  // TODO: Implement email service
  console.log('Would send email:', {
    from: 'PeopleCore <notifications@peoplecore.app>',
    to: employee.email,
    subject: '⏰ Shift Reminder - Starting Soon!',
    html,
  });
}

export async function sendTimesheetSubmittedEmail(
  manager: EmployeeEmailData,
  employee: EmployeeEmailData,
  timesheet: {
    id: string;
    periodStart: Date;
    periodEnd: Date;
    totalHours: number;
  },
  companyId: string
) {
  const { html } = renderPeopleCoreEmail({
    title: 'Timesheet Awaiting Approval',
    intro: `Hi ${manager.name},`,
    sections: [
      {
        description: `${employee.name} has submitted a timesheet for your review.`,
        html: `
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Period:</strong> ${format(timesheet.periodStart, 'MMM d')} - ${format(timesheet.periodEnd, 'MMM d, yyyy')}</p>
            <p style="margin: 0;"><strong>Total Hours:</strong> ${timesheet.totalHours} hours</p>
          </div>
        `,
      },
    ],
    ctas: {
      label: 'Review Timesheet',
      href: `${getAppBaseUrl()}/admin/timesheets/hub`,
    },
  });

  // TODO: Implement email service
  console.log('Would send email:', {
    from: 'PeopleCore <notifications@peoplecore.app>',
    to: manager.email,
    subject: '📋 Timesheet Submitted for Approval',
    html,
  });
}
