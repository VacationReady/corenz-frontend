import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { buildExitInterviewICS } from "@/lib/calendar/ics";
import { renderPeopleCoreEmail } from "@/lib/email/template";
import { randomUUID } from "crypto";

interface CalendarEventConfig {
  attendees?: string[];
  withinDays?: number | string;
  duration?: number | string;
  title?: string;
  description?: string;
  location?: string;
}

interface CreateCalendarEventInput {
  config: CalendarEventConfig;
  employeeId: string;
  companyId: string;
  initiatorUserId?: string;
  context?: Record<string, unknown>;
}

interface CalendarEventResult {
  success: true;
  eventId: string;
  attendees: number;
  scheduledFor: Date;
}

function normaliseNumber(value: number | string | undefined, fallback: number): number {
  if (value === undefined || value === null) return fallback;
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : value;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

function resolveAttendeeTypes(attendees?: string[] | unknown): string[] {
  if (!attendees) return ["employee"];
  if (Array.isArray(attendees)) {
    return attendees.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  return ["employee"];
}

async function resolveOrganizer(initiatorUserId: string | undefined, companyId: string) {
  if (initiatorUserId) {
    const user = await prisma.user.findFirst({
      where: { id: initiatorUserId, companyId },
    });
    if (user) {
      return {
        name: user.name || user.email,
        email: user.email,
      };
    }
  }

  const adminUser = await prisma.user.findFirst({
    where: { companyId, role: "ADMIN" },
  });

  if (adminUser) {
    return {
      name: adminUser.name || adminUser.email,
      email: adminUser.email,
    };
  }

  return {
    name: "PeopleCore Automations",
    email: "noreply@peoplecore.co.nz",
  };
}

export async function createAutomationCalendarEvent({
  config,
  employeeId,
  companyId,
  initiatorUserId,
  context,
}: CreateCalendarEventInput): Promise<CalendarEventResult> {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId },
    include: {
      User: { include: { User: true } },
    },
  });

  if (!employee || !employee.User) {
    throw new Error("Employee not found");
  }

  const attendeeTypes = resolveAttendeeTypes(config?.attendees);
  const attendees: Array<{ name: string; email: string; role?: "REQ-PARTICIPANT" | "OPT-PARTICIPANT" }> = [];

  if (attendeeTypes.includes("employee")) {
    attendees.push({
      name: `${employee.User.firstName || ""} ${employee.User.lastName || ""}`.trim(),
      email: employee.User.email,
      role: "REQ-PARTICIPANT",
    });
  }

  const managerUser = (
    employee.User as unknown as {
      User?: { firstName?: string | null; lastName?: string | null; email: string | null };
    }
  )?.User;
  if (attendeeTypes.includes("manager") && managerUser?.email) {
    attendees.push({
      name: `${managerUser.firstName || ""} ${managerUser.lastName || ""}`.trim(),
      email: managerUser.email,
      role: "REQ-PARTICIPANT",
    });
  }

  if (attendeeTypes.includes("buddy") && context && typeof context === "object") {
    const contextRecord = context as Record<string, unknown>;
    const buddyId = contextRecord["buddyId"];
    if (typeof buddyId === "string" && buddyId.length > 0) {
      const buddy = await prisma.employee.findFirst({
        where: { id: buddyId, companyId },
        include: { User: true },
      });
      if (buddy?.User?.email) {
        attendees.push({
          name: `${buddy.User.firstName || ""} ${buddy.User.lastName || ""}`.trim(),
          email: buddy.User.email,
          role: "REQ-PARTICIPANT",
        });
      }
    }
  }

  if (attendeeTypes.includes("hr")) {
    const hrUser = await prisma.user.findFirst({
      where: { companyId, role: "ADMIN" },
    });
    if (hrUser?.email) {
      attendees.push({
        name: hrUser.name || hrUser.email,
        email: hrUser.email,
        role: "OPT-PARTICIPANT",
      });
    }
  }

  if (attendees.length === 0) {
    throw new Error("No attendees resolved for calendar event");
  }

  const withinDays = Math.max(1, normaliseNumber(config?.withinDays, 1));
  const durationMinutes = Math.max(5, normaliseNumber(config?.duration, 30));

  const startTime = new Date();
  startTime.setDate(startTime.getDate() + withinDays);
  startTime.setHours(10, 0, 0, 0);

  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + durationMinutes);

  const organizer = await resolveOrganizer(initiatorUserId, companyId);

  const uid = `workflow-event-${(globalThis as any)?.crypto?.randomUUID?.() ?? randomUUID()}`;
  const employeeFullName = `${employee.User.firstName || ""} ${employee.User.lastName || ""}`.trim();
  const summary = (config?.title || "Team Meeting").replace("{{employee.name}}", employeeFullName);

  const ics = buildExitInterviewICS({
    uid,
    startTime,
    endTime,
    summary,
    description: config?.description || "Scheduled via automation workflow",
    location: config?.location || "TBD",
    organizer,
    attendees: attendees.map((attendee) => ({
      name: attendee.name,
      email: attendee.email,
      role: attendee.role,
    })),
    method: "REQUEST",
  });

  const emailContent = renderPeopleCoreEmail({
    preheader: `You're invited: ${summary}`,
    title: `Calendar Event: ${summary}`,
    intro: ["You've been invited to a calendar event."],
    sections: [
      {
        html: `
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0;">${summary}</h3>
            <p style="margin: 0; color: #6b7280;">
              <strong>When:</strong> ${startTime.toLocaleString()}<br>
              <strong>Duration:</strong> ${durationMinutes} minutes
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

  for (const attendee of attendees) {
    await resend.emails.send({
      from: "PeopleCore <noreply@peoplecore.co.nz>",
      to: attendee.email,
      subject: `📅 Calendar Invite: ${summary}`,
      html: emailContent.html,
      text: emailContent.text,
      attachments: [
        {
          filename: ics.filename,
          content: Buffer.from(ics.content).toString("base64"),
        },
      ],
    });
  }

  return {
    success: true,
    eventId: uid,
    attendees: attendees.length,
    scheduledFor: startTime,
  };
}
