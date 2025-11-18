import { renderPeopleCoreEmail, getAppBaseUrl } from '@/app/lib/email/template';
import { format } from 'date-fns';

interface MeetingData {
  id: string;
  title: string;
  description?: string | null;
  scheduledAt: Date;
  duration: number;
  location?: string | null;
  meetingUrl?: string | null;
  organizer: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ParticipantData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface EmailResult {
  participantId: string;
  email: string;
  success: boolean;
  error?: string;
}

/**
 * Generate .ics calendar file content for a meeting
 */
function generateICS(meeting: MeetingData, participant: ParticipantData): string {
  const startDate = new Date(meeting.scheduledAt);
  const endDate = new Date(startDate.getTime() + meeting.duration * 60 * 1000);
  
  // Format dates to iCalendar format (YYYYMMDDTHHmmssZ)
  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const organizerName = `${meeting.organizer.firstName} ${meeting.organizer.lastName}`;
  const participantName = `${participant.firstName} ${participant.lastName}`;
  
  // Escape special characters for iCalendar
  const escapeICS = (str: string): string => {
    return str.replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n');
  };

  const description = meeting.description 
    ? escapeICS(meeting.description)
    : `1-2-1 meeting scheduled by ${organizerName}`;

  const location = meeting.location 
    ? escapeICS(meeting.location)
    : meeting.meetingUrl 
      ? 'Online Meeting'
      : 'TBD';

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PeopleCore//Meeting Invite//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${meeting.id}@peoplecore.app`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${escapeICS(meeting.title)}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `ORGANIZER;CN=${escapeICS(organizerName)}:mailto:${meeting.organizer.email}`,
    `ATTENDEE;CN=${escapeICS(participantName)};RSVP=TRUE:mailto:${participant.email}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
  ];

  // Add meeting URL to description if present
  if (meeting.meetingUrl) {
    icsContent.push(`URL:${meeting.meetingUrl}`);
  }

  icsContent.push('END:VEVENT', 'END:VCALENDAR');

  return icsContent.join('\r\n');
}

/**
 * Send meeting invitation email to a participant
 */
export async function sendMeetingInviteEmail(
  meeting: MeetingData,
  participant: ParticipantData
): Promise<EmailResult> {
  try {
    const meetingDate = format(meeting.scheduledAt, 'EEEE, MMMM d, yyyy');
    const meetingTime = format(meeting.scheduledAt, 'h:mm a');
    const endTime = format(
      new Date(meeting.scheduledAt.getTime() + meeting.duration * 60 * 1000),
      'h:mm a'
    );
    const organizerName = `${meeting.organizer.firstName} ${meeting.organizer.lastName}`;

    const { html } = renderPeopleCoreEmail({
      title: 'Meeting Invitation',
      heroBadge: '1-2-1 Meeting',
      intro: `Hi ${participant.firstName},`,
      sections: [
        {
          description: `You've been invited to a meeting by ${organizerName}.`,
          html: `
            <div style="background: #F3F4F6; padding: 24px; border-radius: 12px; margin: 20px 0;">
              <h3 style="margin: 0 0 16px 0; color: #1E293B; font-size: 18px;">${meeting.title}</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748B; width: 120px;">Date:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #1E293B;">${meetingDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748B;">Time:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #1E293B;">${meetingTime} - ${endTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748B;">Duration:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #1E293B;">${meeting.duration} minutes</td>
                </tr>
                ${meeting.location ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748B;">Location:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #1E293B;">${meeting.location}</td>
                </tr>
                ` : ''}
                ${meeting.meetingUrl ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748B;">Meeting Link:</td>
                  <td style="padding: 8px 0;">
                    <a href="${meeting.meetingUrl}" style="color: #0EA5E9; text-decoration: none; font-weight: 600;">
                      Join Online Meeting
                    </a>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #64748B;">Organizer:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #1E293B;">${organizerName}</td>
                </tr>
              </table>
              ${meeting.description ? `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #E2E8F0;">
                  <p style="margin: 0; color: #64748B; font-size: 14px; font-weight: 600;">Description:</p>
                  <p style="margin: 8px 0 0 0; color: #475569;">${meeting.description}</p>
                </div>
              ` : ''}
            </div>
          `,
        },
      ],
      ctas: meeting.meetingUrl ? {
        label: 'Join Meeting',
        href: meeting.meetingUrl,
      } : {
        label: 'View in PeopleCore',
        href: `${getAppBaseUrl()}/performance/meetings`,
      },
      outro: [
        'A calendar invite (.ics file) has been attached to this email for your convenience.',
        'Looking forward to connecting with you!',
      ],
    });

    // Generate .ics file
    const icsContent = generateICS(meeting, participant);

    // TODO: Implement actual email service with attachment support
    // For now, we'll log the email with the ICS content
    console.log('Would send meeting invite email:', {
      from: 'PeopleCore <notifications@peoplecore.app>',
      to: participant.email,
      subject: `Meeting Invitation: ${meeting.title}`,
      html,
      attachments: [
        {
          filename: 'meeting.ics',
          content: icsContent,
          contentType: 'text/calendar; charset=utf-8; method=REQUEST',
        },
      ],
    });

    return {
      participantId: participant.id,
      email: participant.email,
      success: true,
    };
  } catch (error) {
    console.error('Failed to send meeting invite email:', error);
    return {
      participantId: participant.id,
      email: participant.email,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send meeting invitations to multiple participants
 */
export async function sendMeetingInvites(
  meeting: MeetingData,
  participants: ParticipantData[]
): Promise<EmailResult[]> {
  const results: EmailResult[] = [];
  
  // Send emails sequentially to avoid overwhelming the email service
  for (const participant of participants) {
    const result = await sendMeetingInviteEmail(meeting, participant);
    results.push(result);
  }

  return results;
}
