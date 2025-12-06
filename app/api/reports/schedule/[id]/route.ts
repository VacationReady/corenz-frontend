/**
 * Individual Report Schedule API
 * 
 * Handles GET, PATCH, DELETE for specific report schedules.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { z } from "zod";
import { addDays, addWeeks, addMonths, setHours, setMinutes, nextDay, setDate } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const updateScheduleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly"]).optional(),
  dayOfWeek: z.number().min(0).max(6).optional().nullable(),
  dayOfMonth: z.number().min(1).max(31).optional().nullable(),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone: z.string().optional(),
  format: z.enum(["PDF", "EXCEL", "CSV"]).optional(),
  recipientType: z.enum(["custom", "department", "job_role"]).optional(),
  recipients: z.array(z.string()).optional(),
  departmentIds: z.array(z.string()).optional(),
  jobRoleIds: z.array(z.string()).optional(),
  includeMessage: z.boolean().optional(),
  customMessage: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
});

function calculateNextRunTime(
  frequency: string,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  timeOfDay: string,
  timezone: string,
  fromDate: Date = new Date()
): Date {
  const [hours, minutes] = timeOfDay.split(":").map(Number);
  const zonedDate = toZonedTime(fromDate, timezone);
  let nextRun: Date;
  
  switch (frequency) {
    case "daily": {
      nextRun = setMinutes(setHours(zonedDate, hours), minutes);
      if (nextRun <= zonedDate) {
        nextRun = addDays(nextRun, 1);
      }
      break;
    }
    case "weekly": {
      const targetDay = dayOfWeek ?? 1;
      nextRun = nextDay(zonedDate, targetDay as 0 | 1 | 2 | 3 | 4 | 5 | 6);
      nextRun = setMinutes(setHours(nextRun, hours), minutes);
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
      const targetDayOfMonth = dayOfMonth ?? 1;
      nextRun = setDate(zonedDate, Math.min(targetDayOfMonth, 28));
      nextRun = setMinutes(setHours(nextRun, hours), minutes);
      if (nextRun <= zonedDate) {
        nextRun = addMonths(nextRun, 1);
        nextRun = setDate(nextRun, Math.min(targetDayOfMonth, 28));
        nextRun = setMinutes(setHours(nextRun, hours), minutes);
      }
      break;
    }
    case "quarterly": {
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
  
  return fromZonedTime(nextRun, timezone);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensurePrismaConnected();
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const schedule = await prisma.reportSchedule.findFirst({
      where: {
        id: parseInt(id, 10),
        companyId: session.user.companyId,
      },
      include: {
        SavedReport: {
          select: {
            id: true,
            name: true,
            fields: true,
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
          take: 10,
          orderBy: { runAt: "desc" },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: "success",
      data: schedule,
    });
  } catch (error: any) {
    console.error("Error fetching schedule:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensurePrismaConnected();
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const scheduleId = parseInt(id, 10);

    // Verify ownership
    const existingSchedule = await prisma.reportSchedule.findFirst({
      where: {
        id: scheduleId,
        companyId: session.user.companyId,
      },
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = updateScheduleSchema.parse(body);

    // Recalculate next run time if schedule parameters changed
    const shouldRecalculate = 
      validatedData.frequency !== undefined ||
      validatedData.dayOfWeek !== undefined ||
      validatedData.dayOfMonth !== undefined ||
      validatedData.timeOfDay !== undefined ||
      validatedData.timezone !== undefined ||
      validatedData.isActive !== undefined;

    let nextRunAt = existingSchedule.nextRunAt;
    
    if (shouldRecalculate) {
      const isActive = validatedData.isActive ?? existingSchedule.isActive;
      
      if (isActive) {
        nextRunAt = calculateNextRunTime(
          validatedData.frequency ?? existingSchedule.frequency,
          validatedData.dayOfWeek ?? existingSchedule.dayOfWeek,
          validatedData.dayOfMonth ?? existingSchedule.dayOfMonth,
          validatedData.timeOfDay ?? existingSchedule.timeOfDay,
          validatedData.timezone ?? existingSchedule.timezone
        );
      } else {
        nextRunAt = null;
      }
    }

    const updatedSchedule = await prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.frequency && { frequency: validatedData.frequency }),
        ...(validatedData.dayOfWeek !== undefined && { dayOfWeek: validatedData.dayOfWeek }),
        ...(validatedData.dayOfMonth !== undefined && { dayOfMonth: validatedData.dayOfMonth }),
        ...(validatedData.timeOfDay && { timeOfDay: validatedData.timeOfDay }),
        ...(validatedData.timezone && { timezone: validatedData.timezone }),
        ...(validatedData.format && { format: validatedData.format }),
        ...(validatedData.recipientType && { recipientType: validatedData.recipientType }),
        ...(validatedData.recipients && { recipients: validatedData.recipients }),
        ...(validatedData.departmentIds && { departmentIds: validatedData.departmentIds }),
        ...(validatedData.jobRoleIds && { jobRoleIds: validatedData.jobRoleIds }),
        ...(validatedData.includeMessage !== undefined && { includeMessage: validatedData.includeMessage }),
        ...(validatedData.customMessage !== undefined && { customMessage: validatedData.customMessage }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
        nextRunAt,
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
      data: updatedSchedule,
    });
  } catch (error: any) {
    console.error("Error updating schedule:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid schedule data", details: error.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Failed to update schedule" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensurePrismaConnected();
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const scheduleId = parseInt(id, 10);

    // Verify ownership
    const existingSchedule = await prisma.reportSchedule.findFirst({
      where: {
        id: scheduleId,
        companyId: session.user.companyId,
      },
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    await prisma.reportSchedule.delete({
      where: { id: scheduleId },
    });

    return NextResponse.json({
      status: "success",
      message: "Schedule deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting schedule:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete schedule" },
      { status: 500 }
    );
  }
}









