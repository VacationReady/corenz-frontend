// app/api/working-patterns/[id]/route.ts

import { prisma } from "@/lib/prisma";            // ← named import
import { NextResponse } from "next/server";
import { z } from "zod";

// Validate name, optional description, and multi-week data
const WorkingPatternUpdateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  weeks: z.array(
    z.object({
      weekNumber: z.number().int().min(1),
      days: z.array(
        z.object({
          day: z.string(),
          type: z.enum(["FULL_DAY", "HALF_DAY_AM", "HALF_DAY_PM"]),
        })
      ),
    })
  ),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name, description, weeks } = await req.json();
    await WorkingPatternUpdateSchema.parseAsync({ name, description, weeks });

    const updatedPattern = await prisma.workingPattern.update({
      where: { id: params.id },
      data: {
        name,
        description,  // ← now supported in schema
        WorkingPatternWeek: {
          deleteMany: {}, // clear out existing weeks & days
          create: weeks.map((week: any) => ({
            weekNumber: week.weekNumber,
            WorkingPatternDay: {
              create: week.days.map((day: any) => ({
                day: day.day,
                type: day.type,
              })),
            },
          })),
        },
      },
      include: {
        WorkingPatternWeek: {
          include: { WorkingPatternDay: true },
        },
      },
    });

    return NextResponse.json(updatedPattern, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/working-patterns/[id] error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      {
        message: "Error updating working pattern",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.workingPattern.update({
      where: { id: params.id },
      data: { active: false },
    });
    return NextResponse.json({ message: "Pattern archived" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/working-patterns/[id] error:", error);
    return NextResponse.json(
      {
        message: "Error deleting working pattern",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}

export function POST() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}

export function PUT() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}
