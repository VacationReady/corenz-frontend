import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { buildExitInterviewICS } from "@/lib/calendar/ics";
import { renderPeopleCoreEmail } from "@/lib/email/template";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { config, employeeId, context } = await req.json();

    // Fetch employee and related data
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: session.user.companyId },
      include: {
        User: true,
      },
    });

    if (!employee || !employee.User) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Determine attendees
    const attendees: Array<{ name: string; email: string; role: string }> = [];
    const attendeeTypes = Array.isArray(config.attendees) ? config.attendees : ['employee'];

    if (attendeeTypes.includes('employee')) {
      attendees.push({
        name: `${employee.User.firstName || ''} ${employee.User.lastName || ''}`.trim(),
        email: employee.User.email,
        role: 'REQ-PARTICIPANT',
      });
    }

    let managerUser: (typeof employee.User) | null = null;
    if (
      attendeeTypes.includes('manager') &&
      employee.User?.managerId
    ) {
      managerUser = await prisma.user.findFirst({
        where: { id: employee.User.managerId, companyId: session.user.companyId },
      });
    }

    if (attendeeTypes.includes('manager') && managerUser?.email) {
      const managerName = `${managerUser.firstName || ''} ${managerUser.lastName || ''}`.trim();
      attendees.push({
        name: managerName || managerUser.email,
        email: managerUser.email,
        role: 'REQ-PARTICIPANT',
      });
    }

    if (attendeeTypes.includes('buddy') && context?.buddyId) {
      const buddy = await prisma.employee.findFirst({
        where: { id: context.buddyId },
        include: { User: true },
      });
      if (buddy?.User) {
        attendees.push({
          name: `${buddy.User.firstName || ''} ${buddy.User.lastName || ''}`.trim(),
          email: buddy.User.email,
          role: 'REQ-PARTICIPANT',
        });
      }
    }

    if (attendeeTypes.includes('hr')) {
      const hrUsers = await prisma.user.findMany({
        where: { companyId: session.user.companyId, role: 'ADMIN' },
        take: 1,
      });
      if (hrUsers[0]) {
        attendees.push({
          name: hrUsers[0].name || hrUsers[0].email,
          email: hrUsers[0].email,
          role: 'OPT-PARTICIPANT',
        });
      }
    }

    // Calculate event timing
    const withinDays = config.withinDays || 7;
    const duration = config.duration || 30; // minutes
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 1); // Tomorrow by default
    startTime.setHours(10, 0, 0, 0); // 10 AM

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + duration);

    // Generate ICS file
    const uid = `workflow-event-${crypto.randomUUID()}`;
    const title = (config.title || 'Team Meeting')
      .replace('{{employee.name}}', `${employee.User.firstName || ''} ${employee.User.lastName || ''}`.trim());

    const ics = buildExitInterviewICS({
      uid,
      startTime,
      endTime,
      summary: title,
      description: config.description || `Scheduled via automation workflow`,
      location: config.location || 'TBD',
      organizer: {
        name: session.user.name || session.user.email,
        email: session.user.email,
      },
      attendees: attendees.map(a => ({
        name: a.name,
        email: a.email,
        role: a.role as any,
      })),
      method: 'REQUEST',
    });

    // Send calendar invites to all attendees
    for (const attendee of attendees) {
      const { html, text } = renderPeopleCoreEmail({
        headline: `Calendar Event: ${title}`,
        bodyHtml: `
            <p>You've been invited to:</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <h3 style="margin: 0 0 8px 0;">${title}</h3>
              <p style="margin: 0; color: #6b7280;">
                <strong>When:</strong> ${startTime.toLocaleString()}<br>
                <strong>Duration:</strong> ${duration} minutes
              </p>
            </div>
            <p>A calendar invitation (.ics) has been attached to this email.</p>
          `,
        ctaText: null,
        ctaUrl: null,
      });

      await resend.emails.send({
        from: "PeopleCore <noreply@peoplecore.co.nz>",
        to: attendee.email,
        subject: `📅 Calendar Invite: ${title}`,
        html,
        text: text || undefined,
        attachments: [
          {
            filename: ics.filename,
            content: Buffer.from(ics.content).toString('base64'),
          },
        ],
      });
    }

    // Create calendar event record (optional - if you have a CalendarEvent model)
    // You can add this to the calendar so admins see it

    return NextResponse.json({
      success: true,
      eventId: uid,
      attendees: attendees.length,
      scheduledFor: startTime,
    });
  } catch (error: any) {
    console.error('Calendar event creation failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}

