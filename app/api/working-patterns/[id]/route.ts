// ✅ PATCH API for updating working patterns with clear current vs editable structure

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const WorkingPatternUpdateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  days: z.array(
    z.object({
      day: z.string(),
      type: z.enum(["FULL_DAY", "HALF_DAY_AM", "HALF_DAY_PM"]),
    })
  ).min(1, "At least one day is required"),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;

  try {
    const json = await req.json();
    const parsed = WorkingPatternUpdateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, days } = parsed.data;

    // Update pattern basic fields
    const updatedPattern = await prisma.workingPattern.update({
      where: { id },
      data: {
        name,
        description,
        days: {
          deleteMany: {}, // remove all existing days
          create: days.map((dayObj) => ({
            day: dayObj.day,
            type: dayObj.type,
          })),
        },
      },
      include: { days: true },
    });

    return NextResponse.json(updatedPattern, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/working-patterns/[id] error:", error);
    return NextResponse.json(
      { message: "Error updating working pattern", error: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
}
