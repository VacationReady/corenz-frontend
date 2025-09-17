import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// Zod schema for creating a new pattern
const WorkingPatternCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  weeks: z
    .array(
      z.object({
        weekNumber: z.number().int().min(1, "Week number must be at least 1"),
        days: z
          .array(
            z.object({
              day: z.string().min(1, "Day is required"),
              type: z.enum(["FULL_DAY", "HALF_DAY_AM", "HALF_DAY_PM"]),
            }),
          )
          .min(1, "At least one day is required"),
      }),
    )
    .min(1, "At least one week is required"),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
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
      weeks: pattern.WorkingPatternWeek.map((week) => ({
        id: week.id,
        weekNumber: week.weekNumber,
        days: week.WorkingPatternDay.map((day) => ({
          id: day.id,
          day: day.day,
          type: day.type,
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, weeks } = WorkingPatternCreateSchema.parse(body);

    const pattern = await prisma.workingPattern.create({
      data: {
        name,
        description,
        companyId: session.user.companyId,
        WorkingPatternWeek: {
          create: weeks.map((week) => ({
            weekNumber: week.weekNumber,
            WorkingPatternDay: {
              create: week.days.map((day) => ({
                day: day.day,
                type: day.type,
              })),
            },
          })),
        },
      } as any,
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

