import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// Zod schema for updating patterns if needed
const WorkingPatternUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;

  try {
    const json = await req.json();

    // Allow simple restore by passing { active: true }
    if (json.active === true) {
      const restoredPattern = await prisma.workingPattern.update({
        where: { id },
        data: { active: true },
        include: { weeks: { include: { days: true } } },
      });
      return NextResponse.json(restoredPattern, { status: 200 });
    }

    const parsed = WorkingPatternUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updatedPattern = await prisma.workingPattern.update({
      where: { id },
      data: parsed.data,
      include: { weeks: { include: { days: true } } },
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

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const { searchParams } = new URL(req.url);
  const permanent = searchParams.get("permanent");

  try {
    if (permanent === "true") {
      await prisma.workingPattern.delete({
        where: { id },
      });
      return NextResponse.json({ message: "Pattern permanently deleted" }, { status: 200 });
    } else {
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
