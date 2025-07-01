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

// PATCH: Update working pattern or restore archived
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;

  try {
    const json = await req.json();

    // Allow simple restore without validation
    if (json.active === true) {
      const restoredPattern = await prisma.workingPattern.update({
        where: { id },
        data: { active: true },
        include: { days: true },
      });
      return NextResponse.json(restoredPattern, { status: 200 });
    }

    // Else, perform full validation and update
    const parsed = WorkingPatternUpdateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, days } = parsed.data;

    const updatedPattern = await prisma.workingPattern.update({
      where: { id },
      data: {
        name,
        description,
        days: {
          deleteMany: {},
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

// DELETE: Soft delete (archive) or permanent delete
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const { searchParams } = new URL(req.url);
  const permanent = searchParams.get("permanent");

  try {
    if (permanent === "true") {
      // Perform permanent delete
      await prisma.workingPattern.delete({
        where: { id },
      });
      return NextResponse.json({ message: "Pattern permanently deleted" }, { status: 200 });
    } else {
      // Perform soft delete (archive)
      await prisma.workingPattern.update({
        where: { id },
        data: { active: false },
      });
      return NextResponse.json({ message: "Pattern archived" }, { status: 200 });
    }
  } catch (error) {
    console.error("DELETE /api/working-patterns/[id] error:", error);
    return NextResponse.json(
      { message: "Error deleting working pattern", error: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
}
