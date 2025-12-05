import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth-options";
import { calculateDayHours } from "@/lib/working-pattern-utils";

// Zod schema for day definition with optional time fields for TIMED type
const DaySchema = z.object({
  day: z.string().min(1, "Day is required"),
  type: z.enum(["FULL_DAY", "HALF_DAY_AM", "HALF_DAY_PM", "TIMED"]),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/, "Invalid time format").optional(),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/, "Invalid time format").optional(),
  breakMinutes: z.number().int().min(0).optional(),
  hoursPerDay: z.number().positive().optional(),
}).refine(
  (data) => {
    // TIMED type requires startTime and endTime
    if (data.type === "TIMED") {
      return !!data.startTime && !!data.endTime;
    }
    return true;
  },
  {
    message: "TIMED day type requires startTime and endTime",
    path: ["type"],
  }
);

// Zod schema for creating a new pattern
const WorkingPatternCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  patternType: z.enum(["STANDARD", "SHIFT_BASED", "FLEXIBLE", "COMPRESSED"]).default("STANDARD"),
  contractedHoursPerWeek: z.number().positive().optional(),
  defaultBreakMinutes: z.number().int().min(0).optional(),
  weeks: z
    .array(
      z.object({
        weekNumber: z.number().int().min(1, "Week number must be at least 1"),
        days: z.array(DaySchema).min(0, "Days can be empty for shift-based patterns"),
      }),
    )
    .min(0, "Weeks array is required"), // Allow empty weeks for SHIFT_BASED
}).refine(
  (data) => {
    // For SHIFT_BASED patterns, weeks can be empty but contractedHoursPerWeek is required
    if (data.patternType === "SHIFT_BASED") {
      return data.contractedHoursPerWeek !== undefined && data.contractedHoursPerWeek > 0;
    }
    // For other patterns, at least one week is required
    return data.weeks.length >= 1;
  },
  {
    message: "SHIFT_BASED patterns require contractedHoursPerWeek, other patterns require at least one week",
    path: ["weeks"],
  }
);

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const patterns = await prisma.workingPattern.findMany({
      where: { companyId: session.user.companyId, active: true },
      orderBy: { name: "asc" },
      include: {
        WorkingPatternWeek: {
          include: { WorkingPatternDay: true },
          orderBy: { weekNumber: "asc" },
        },
      },
    });

    // ✅ Remap to structure expected by the frontend
    const formatted = patterns.map((pattern) => ({
      id: pattern.id,
      name: pattern.name,
      description: pattern.description,
      patternType: pattern.patternType,
      contractedHoursPerWeek: pattern.contractedHoursPerWeek ? parseFloat(pattern.contractedHoursPerWeek.toString()) : null,
      defaultBreakMinutes: pattern.defaultBreakMinutes ?? 30,
      weeks: pattern.WorkingPatternWeek.map((week) => ({
        id: week.id,
        weekNumber: week.weekNumber,
        days: week.WorkingPatternDay.map((day) => ({
          id: day.id,
          day: day.day,
          type: day.type,
          hoursPerDay: day.hoursPerDay ? parseFloat(day.hoursPerDay.toString()) : null,
          startTime: day.startTime,
          endTime: day.endTime,
          breakMinutes: day.breakMinutes ?? 0,
        })),
      })),
    }));

    return NextResponse.json(formatted, { status: 200 });
  } catch (error) {
    console.error("GET /api/working-patterns error:", error);
    return NextResponse.json(
      {
        message: "Error fetching working patterns",
        error: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, patternType, contractedHoursPerWeek, defaultBreakMinutes, weeks } = WorkingPatternCreateSchema.parse(body);

    // Build the data object conditionally based on whether there are weeks
    const createData: any = {
      name,
      description,
      patternType,
      contractedHoursPerWeek: contractedHoursPerWeek ?? null,
      defaultBreakMinutes: defaultBreakMinutes ?? 30,
      companyId: session.user.companyId,
    };

    // Only include WorkingPatternWeek if there are weeks to create
    if (weeks.length > 0) {
      createData.WorkingPatternWeek = {
        create: weeks.map((week) => ({
          weekNumber: week.weekNumber,
          WorkingPatternDay: {
            create: week.days.map((day) => {
              // Auto-calculate hoursPerDay for TIMED type
              let hoursPerDay = day.hoursPerDay;
              if (day.type === "TIMED" && day.startTime && day.endTime) {
                const breakMins = day.breakMinutes ?? defaultBreakMinutes ?? 30;
                hoursPerDay = calculateDayHours(day.startTime, day.endTime, breakMins);
              }
              
              return {
                day: day.day,
                type: day.type,
                startTime: day.startTime ?? null,
                endTime: day.endTime ?? null,
                breakMinutes: day.breakMinutes ?? 0,
                hoursPerDay: hoursPerDay ?? null,
              };
            }),
          },
        })),
      };
    }

    const pattern = await prisma.workingPattern.create({
      data: createData,
      include: {
        WorkingPatternWeek: {
          include: { WorkingPatternDay: true },
          orderBy: { weekNumber: "asc" },
        },
      },
    });

    return NextResponse.json(pattern, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/working-patterns error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      {
        message: "Error creating working pattern",
        error: error.message || String(error),
      },
      { status: 500 },
    );
  }
}

export function PATCH() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}
export function PUT() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}
export function DELETE() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}

