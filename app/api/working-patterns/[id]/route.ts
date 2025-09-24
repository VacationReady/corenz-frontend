// app/api/working-patterns/[id]/route.ts

import { prisma } from "@/lib/prisma"; // ← named import
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
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
        }),
      ),
    }),
  ),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { name, description, weeks } = await req.json();
    await WorkingPatternUpdateSchema.parseAsync({ name, description, weeks });

    // Ensure pattern belongs to the same company
    const { id } = await context.params;
    const existing = await prisma.workingPattern.findFirst({
      where: { id: id, companyId: session.user.companyId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const updatedPattern = await prisma.workingPattern.update({
      where: { id: id },
      data: {
        name,
        description, // ← now supported in schema
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
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    const existing = await prisma.workingPattern.findFirst({
      where: { id: id, companyId: session.user.companyId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    await prisma.workingPattern.update({
      where: { id: id },
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
      { status: 500 },
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
