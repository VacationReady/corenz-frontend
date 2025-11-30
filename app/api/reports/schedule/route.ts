/**
 * Report Schedule API
 * 
 * Manages scheduled report delivery including:
 * - Creating schedules (daily, weekly, monthly)
 * - Managing recipients
 * - Tracking run history
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { z } from "zod";
import { addDays, addWeeks, addMonths, setHours, setMinutes, nextDay, setDate } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const scheduleSchema = z.object({
  reportId: z.number(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly"]),
  dayOfWeek: z.number().min(0).max(6).optional(), // For weekly
  dayOfMonth: z.number().min(1).max(31).optional(), // For monthly/quarterly
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/), // HH:mm format
  timezone: z.string().default("Pacific/Auckland"),
  format: z.enum(["PDF", "EXCEL", "CSV"]).default("PDF"),
  recipientType: z.enum(["custom", "department", "job_role"]).default("custom"),
  recipients: z.array(z.string()).optional(),
  departmentIds: z.array(z.string()).optional(),
  jobRoleIds: z.array(z.string()).optional(),
  includeMessage: z.boolean().default(false),
  customMessage: z.string().max(1000).optional(),
  isActive: z.boolean().default(true),
});

/**
 * Calculate the next run time based on schedule configuration
 */
function calculateNextRunTime(
  frequency: string,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  timeOfDay: string,
  timezone: string,
  fromDate: Date = new Date()
): Date {
  const [hours, minutes] = timeOfDay.split(":").map(Number);
  
  // Convert fromDate to the schedule's timezone
  const zonedDate = toZonedTime(fromDate, timezone);
  
  let nextRun: Date;
  
  switch (frequency) {
    case "daily": {
      // Set time for today
      nextRun = setMinutes(setHours(zonedDate, hours), minutes);
      // If today's time has passed, move to tomorrow
      if (nextRun <= zonedDate) {
        nextRun = addDays(nextRun, 1);
      }
      break;
    }
    
    case "weekly": {
      // Find next occurrence of the specified day
      const targetDay = dayOfWeek ?? 1; // Default to Monday
      nextRun = nextDay(zonedDate, targetDay as 0 | 1 | 2 | 3 | 4 | 5 | 6);
      nextRun = setMinutes(setHours(nextRun, hours), minutes);
      // If we're on the target day but time has passed, go to next week
      if (zonedDate.getDay() === targetDay) {
        const todayTime = setMinutes(setHours(zonedDate, hours), minutes);
        if (todayTime <= zonedDate) {
          nextRun = addWeeks(nextRun, 1);
        } else {
          nextRun = todayTime;
        }
      }
      break;
    }
    
    case "monthly": {
      // Set to the specified day of month
      const targetDayOfMonth = dayOfMonth ?? 1;
      nextRun = setDate(zonedDate, Math.min(targetDayOfMonth, 28)); // Clamp to 28 to avoid issues
      nextRun = setMinutes(setHours(nextRun, hours), minutes);
      // If this month's date has passed, move to next month
      if (nextRun <= zonedDate) {
        nextRun = addMonths(nextRun, 1);
        nextRun = setDate(nextRun, Math.min(targetDayOfMonth, 28));
        nextRun = setMinutes(setHours(nextRun, hours), minutes);
      }
      break;
    }
    
    case "quarterly": {
      // Similar to monthly but add 3 months
      const targetDayOfMonth = dayOfMonth ?? 1;
      nextRun = setDate(zonedDate, Math.min(targetDayOfMonth, 28));
      nextRun = setMinutes(setHours(nextRun, hours), minutes);
      if (nextRun <= zonedDate) {
        nextRun = addMonths(nextRun, 3);
        nextRun = setDate(nextRun, Math.min(targetDayOfMonth, 28));
        nextRun = setMinutes(setHours(nextRun, hours), minutes);
      }
      break;
    }
    
    default:
      nextRun = addDays(zonedDate, 1);
  }
  
  // Convert back to UTC
  return fromZonedTime(nextRun, timezone);
}

export async function GET(req: Request) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get("reportId");

    const schedules = await prisma.reportSchedule.findMany({
      where: {
        companyId: session.user.companyId,
        ...(reportId && { reportId: parseInt(reportId, 10) }),
      },
      include: {
        SavedReport: {
          select: {
            id: true,
            name: true,
          },
        },
        CreatedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        RunHistory: {
          take: 5,
          orderBy: { runAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      status: "success",
      data: schedules,
    });
  } catch (error: any) {
    console.error("Error fetching report schedules:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch schedules" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = scheduleSchema.parse(body);

    // Verify report exists and belongs to company
    const report = await prisma.savedReport.findFirst({
      where: {
        id: validatedData.reportId,
        companyId: session.user.companyId,
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    // Calculate next run time
    const nextRunAt = validatedData.isActive
      ? calculateNextRunTime(
          validatedData.frequency,
          validatedData.dayOfWeek ?? null,
          validatedData.dayOfMonth ?? null,
          validatedData.timeOfDay,
          validatedData.timezone
        )
      : null;

    const schedule = await prisma.reportSchedule.create({
      data: {
        reportId: validatedData.reportId,
        name: validatedData.name,
        description: validatedData.description,
        frequency: validatedData.frequency,
        dayOfWeek: validatedData.dayOfWeek,
        dayOfMonth: validatedData.dayOfMonth,
        timeOfDay: validatedData.timeOfDay,
        timezone: validatedData.timezone,
        format: validatedData.format,
        recipientType: validatedData.recipientType,
        recipients: validatedData.recipients || [],
        departmentIds: validatedData.departmentIds || [],
        jobRoleIds: validatedData.jobRoleIds || [],
        includeMessage: validatedData.includeMessage,
        customMessage: validatedData.customMessage,
        isActive: validatedData.isActive,
        nextRunAt,
        companyId: session.user.companyId,
        createdById: session.user.id,
      },
      include: {
        SavedReport: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      status: "success",
      data: schedule,
    });
  } catch (error: any) {
    console.error("Error creating report schedule:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid schedule data", details: error.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Failed to create schedule" },
      { status: 500 }
    );
  }
}





