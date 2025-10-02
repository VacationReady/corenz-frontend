import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { buildExitInterviewICS } from "@/lib/calendar/ics";
import { renderPeopleCoreEmail } from "@/lib/email/template";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { config, employeeId, context } = await req.json();

    // Fetch employee and related data (User plus self-relation for manager on User.User)
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: session.user.companyId },
      include: {
        User: { include: { User: true } },
      },
    });

    if (!employee || !employee.User) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Determine attendees
    const attendees: Array<{
      name: string;
      email: string;
      role?: "REQ-PARTICIPANT" | "OPT-PARTICIPANT";
    }> = [];

    const attendeeTypes = Array.isArray(config?.attendees)
      ? (config.attendees as string[])
      : ["employee"];

    if (attendeeTypes.includes("employee")) {
      attendees.push({
        name: `${employee.User.firstName || ""} ${employee.User.lastName || ""}`.trim(),
        email: employee.User.email,
        role: "REQ-PARTICIPANT",
      });
    }

    // Manager is the self-relation on User: employee.User.User
    const managerUser = (employee.User as any)?.User as any;
    if (attendeeTypes.includes("manager") && managerUser) {
      attendees.push({
        name: `${managerUser.firstName || ""} ${managerUser.lastName || ""}`.trim(),
        email: managerUser.email,
        role: "REQ-PARTICIPANT",
      });
    }

    if (attendeeTypes.includes("buddy") && context?.buddyId) {
      const buddy = await prisma.employee.findFirst({
        where: { id: context.buddyId, companyId: session.user.companyId },
        include: { User: true },
      });
      if (buddy?.User) {
        attendees.push({
          name: `${buddy.User.firstName || ""} ${buddy.User.lastName || ""}`.trim(),
          email: buddy.User.email,
          role: "REQ-PARTICIPANT",
        });
      }
    }

    if (attendeeTypes.includes("hr")) {
      const hrUsers = await prisma.user.findMany({
        where: { companyId: session.user.companyId, role: "ADMIN" },
        take: 1,
      });
      if (hrUsers[0]) {
        attendees.push({
          name: hrUsers[0].name || hrUsers[0].email,
          email: hrUsers[0].email,
          role: "OPT-PARTICIPANT",
        });
      }
    }

    // Calculate event timing
    const parsedWithinDays = Number(config?.withinDays);
    const withinDays = Number.isFinite(parsedWithinDays)
      ? Math.max(1, Math.floor(parsedWithinDays))
      : 1;

    const duration = Number(config?.duration) || 30; // minutes

    const startTime = new Date();
    startTime.setDate(startTime.getDate() + withinDays);
    startTime.setHours(10, 0, 0, 0); // Default to 10:00 AM

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + duration);

    // Generate ICS file
    const uid = `workflow-event-${(globalThis as any)?.crypto?.randomUUID?.() ?? randomUUID()}`;

    const titleTemplate = config?.title || "Team Meeting";
    const employeeFullName = `${employee.User.firstName || ""} ${employee.User.lastName || ""}`.trim();
    const title = titleTemplate.replace("{{employee.name}}", employeeFullName);

    const ics = buildExitInterviewICS({
      uid,
      startTime,
      endTime,
      summary: title,
      description: config?.description || `Scheduled via automation workflow`,
      location: config?.location || "TBD",
      organizer: {
        name: session.user.name || session.user.email,
        email: session.user.email,
      },
      attendees: attendees.map((a) => ({
        name: a.name,
        email: a.email,
        role: a.role,
      })),
      method: "REQUEST",
    });

    // Send calendar invites to all attendees
    for (const attendee of attendees) {
      const { html, text } = renderPeopleCoreEmail({
        preheader: `You're invited: ${title}`,
        title: `Calendar Event: ${title}`,
        intro: ["You've been invited to a calendar event."],
        sections: [
          {
            html: `
              <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin: 0 0 8px 0;">${title}</h3>
                <p style="margin: 0; color: #6b7280;">
                  <strong>When:</strong> ${startTime.toLocaleString()}<br>
                  <strong>Duration:</strong> ${duration} minutes
                </p>
                <p style="margin: 12px 0 0 0; color: #6b7280;">
                  <strong>Participants:</strong> ${attendees
                    .map((participant) => participant.name || participant.email)
                    .join(", ")}
                </p>
              </div>
            `,
          },
        ],
        outro: ["A calendar invitation (.ics) has been attached to this email."],
      });

      await resend.emails.send({
        from: "PeopleCore <noreply@peoplecore.co.nz>",
        to: attendee.email,
        subject: `📅 Calendar Invite: ${title}`,
        html,
        text,
        attachments: [
          {
            filename: ics.filename,
            content: Buffer.from(ics.content).toString("base64"),
          },
        ],
      });
    }

    // Optional: persist a CalendarEvent record here if you have a model

    return NextResponse.json({
      success: true,
      eventId: uid,
      attendees: attendees.length,
      scheduledFor: startTime,
    });
  } catch (error) {
    console.error("Calendar event creation failed:", error);
    const message = error instanceof Error ? error.message : "Failed to create calendar event";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
