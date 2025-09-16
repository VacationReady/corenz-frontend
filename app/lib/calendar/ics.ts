import { format } from "date-fns";

export interface ICSOptions {
  uid: string;
  startTime: Date;
  endTime: Date;
  summary: string;
  description: string;
  location?: string;
  organizer: {
    name: string;
    email: string;
  };
  attendees: Array<{
    name: string;
    email: string;
    role?: "REQ-PARTICIPANT" | "OPT-PARTICIPANT";
  }>;
  method?: "REQUEST" | "CANCEL";
}

/**
 * Escape text for ICS format (CRLF, commas, semicolons, backslashes)
 */
function escapeICS(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n/g, "\\n")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\n");
}

/**
 * Fold long lines according to RFC 5545 (75 characters max per line)
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;

  let result = "";
  let remaining = line;

  while (remaining.length > 75) {
    result += remaining.substring(0, 75) + "\r\n ";
    remaining = remaining.substring(75);
  }

  if (remaining.length > 0) {
    result += remaining;
  }

  return result;
}

/**
 * Format date to ICS format (UTC)
 */
function formatICSDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

/**
 * Build ICS calendar content
 */
export function buildExitInterviewICS(options: ICSOptions): {
  filename: string;
  content: string;
  mime: "text/calendar";
} {
  const {
    uid,
    startTime,
    endTime,
    summary,
    description,
    location = "Online/Office",
    organizer,
    attendees,
    method = "REQUEST",
  } = options;

  const now = new Date();
  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PeopleCore//ExitInterview//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:" + method,
    "BEGIN:VEVENT",
    "UID:" + uid,
    "DTSTAMP:" + formatICSDate(now),
    "DTSTART:" + formatICSDate(startTime),
    "DTEND:" + formatICSDate(endTime),
    "SUMMARY:" + escapeICS(summary),
    "DESCRIPTION:" + escapeICS(description),
    "LOCATION:" + escapeICS(location),
    "ORGANIZER;CN=" + escapeICS(organizer.name) + ":mailto:" + organizer.email,
  ];

  // Add attendees
  attendees.forEach((attendee) => {
    const role = attendee.role || "REQ-PARTICIPANT";
    icsLines.push(
      "ATTENDEE;CN=" +
        escapeICS(attendee.name) +
        ";ROLE=" +
        role +
        ":mailto:" +
        attendee.email,
    );
  });

  icsLines.push("END:VEVENT", "END:VCALENDAR");

  const content = icsLines.map((line) => foldLine(line)).join("\r\n") + "\r\n";

  return {
    filename: `exit-interview-${uid}.ics`,
    content,
    mime: "text/calendar",
  };
}

/**
 * Generate ICS for exit interview confirmation
 */
export function buildExitInterviewConfirmationICS(
  offboarding: any,
  employee: any,
  interviewer: any,
): { filename: string; content: string; mime: "text/calendar" } {
  if (!offboarding.exitInterviewDate) {
    throw new Error("Exit interview date is required");
  }

  const startTime = new Date(offboarding.exitInterviewDate);
  const endTime = offboarding.exitInterviewEnd
    ? new Date(offboarding.exitInterviewEnd)
    : new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour

  const uid =
    offboarding.inviteIcsUid ||
    `exit-interview-${offboarding.id}-${Date.now()}`;

  const employeeName = `${employee.firstName || "Unknown"} ${employee.lastName || "Employee"}`;
  const summary = `Exit Interview — ${employeeName}`;

  const interviewerName =
    interviewer.name ||
    (interviewer.firstName && interviewer.lastName
      ? `${interviewer.firstName} ${interviewer.lastName}`
      : interviewer.firstName || interviewer.lastName || "Unknown Interviewer");

  const description = [
    `Interviewer: ${interviewerName}`,
    `Employee: ${employeeName}`,
    offboarding.exitInterviewNotes
      ? `Notes: ${offboarding.exitInterviewNotes}`
      : "",
  ]
    .filter(Boolean)
    .join("\\n");

  const organizer = {
    name: interviewerName,
    email:
      interviewer.email ||
      offboarding.interviewerEmail ||
      "unknown@example.com",
  };

  const attendees = [
    {
      name: employeeName,
      email: employee.email,
      role: "REQ-PARTICIPANT" as const,
    },
    ...(interviewer.email && interviewer.email !== employee.email
      ? [
          {
            name: interviewerName,
            email: interviewer.email,
            role: "REQ-PARTICIPANT" as const,
          },
        ]
      : []),
  ];

  return buildExitInterviewICS({
    uid,
    startTime,
    endTime,
    summary,
    description,
    location: offboarding.location,
    organizer,
    attendees,
    method: "REQUEST",
  });
}

/**
 * Generate ICS cancellation for exit interview
 */
export function buildExitInterviewCancellationICS(
  offboarding: any,
  employee: any,
  interviewer: any,
): { filename: string; content: string; mime: "text/calendar" } {
  if (!offboarding.inviteIcsUid) {
    throw new Error("No ICS UID found for cancellation");
  }

  const startTime = new Date(offboarding.exitInterviewDate!);
  const endTime = offboarding.exitInterviewEnd
    ? new Date(offboarding.exitInterviewEnd)
    : new Date(startTime.getTime() + 60 * 60 * 1000);

  const summary = `Exit Interview — ${employee.firstName} ${employee.lastName} (CANCELLED)`;
  const description = "This exit interview has been cancelled.";

  const organizer = {
    name:
      interviewer.name || `${interviewer.firstName} ${interviewer.lastName}`,
    email: interviewer.email || offboarding.interviewerEmail,
  };

  const attendees = [
    {
      name: `${employee.firstName} ${employee.lastName}`,
      email: employee.email,
      role: "REQ-PARTICIPANT" as const,
    },
  ];

  return buildExitInterviewICS({
    uid: offboarding.inviteIcsUid,
    startTime,
    endTime,
    summary,
    description,
    location: offboarding.location,
    organizer,
    attendees,
    method: "CANCEL",
  });
}

